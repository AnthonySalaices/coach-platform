import {
  listAvailabilityByCoach,
  type RecurringWindow,
} from "@/server/db/repos/availability";
import { listActiveBookingTimesByCoach } from "@/server/db/repos/bookings";

interface Range {
  start: number;
  end: number;
} // epoch ms

const DAY_MS = 86_400_000;

function overlaps(s: number, e: number, ranges: Range[]): boolean {
  return ranges.some((r) => s < r.end && e > r.start);
}

/**
 * Pure slot computation, all in UTC for determinism. Walks each day in the
 * horizon, expands the recurring windows for that weekday into fixed-step
 * slots, and drops anything in the past, inside an unavailability exception, or
 * overlapping an existing booking. (Timezone handling is intentionally simple —
 * everything is UTC; per-coach timezones are a future enhancement.)
 */
export function computeSlots(
  recurring: RecurringWindow[],
  exceptions: Range[],
  busy: Range[],
  opts: { durationMin: number; fromMs: number; days: number; stepMin: number },
): number[] {
  const durMs = opts.durationMin * 60_000;
  const stepMs = opts.stepMin * 60_000;
  const day0 = Math.floor(opts.fromMs / DAY_MS) * DAY_MS; // UTC midnight
  const out = new Set<number>();

  for (let d = 0; d < opts.days; d++) {
    const dayStart = day0 + d * DAY_MS;
    const weekday = new Date(dayStart).getUTCDay();
    for (const w of recurring) {
      if (w.weekday !== weekday) continue;
      const winStart = dayStart + w.startMinute * 60_000;
      const winEnd = dayStart + w.endMinute * 60_000;
      for (let s = winStart; s + durMs <= winEnd; s += stepMs) {
        if (s < opts.fromMs) continue;
        const e = s + durMs;
        if (overlaps(s, e, exceptions)) continue;
        if (overlaps(s, e, busy)) continue;
        out.add(s);
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

export interface Slot {
  start: Date;
  end: Date;
}

/** Bookable slots for a service: availability − exceptions − bookings − past. */
export async function availableSlotsForService(
  coachId: string,
  durationMin: number,
  opts: { days?: number; stepMin?: number } = {},
): Promise<Slot[]> {
  const rows = await listAvailabilityByCoach(coachId);

  const recurring: RecurringWindow[] = rows
    .filter((r) => r.type === "recurring")
    .map((r) => ({
      weekday: Number(r.rule.weekday),
      startMinute: Number(r.rule.startMinute),
      endMinute: Number(r.rule.endMinute),
    }))
    .filter(
      (w) =>
        Number.isFinite(w.weekday) &&
        Number.isFinite(w.startMinute) &&
        Number.isFinite(w.endMinute) &&
        w.endMinute > w.startMinute,
    );

  const exceptions: Range[] = rows
    .filter((r) => r.type === "exception" && r.startsAt && r.endsAt)
    .map((r) => ({ start: r.startsAt!.getTime(), end: r.endsAt!.getTime() }));

  const fromMs = Date.now();
  const busyRows = await listActiveBookingTimesByCoach(
    coachId,
    new Date(fromMs),
  );
  const busy: Range[] = busyRows.map((b) => ({
    start: b.startAt.getTime(),
    end: b.endAt.getTime(),
  }));

  const ms = computeSlots(recurring, exceptions, busy, {
    durationMin,
    fromMs,
    days: opts.days ?? 14,
    stepMin: opts.stepMin ?? 30,
  });
  return ms.map((s) => ({
    start: new Date(s),
    end: new Date(s + durationMin * 60_000),
  }));
}

/** Server-side re-check: is `start` a genuinely-bookable slot right now? */
export async function isSlotAvailable(
  coachId: string,
  durationMin: number,
  start: Date,
): Promise<boolean> {
  const slots = await availableSlotsForService(coachId, durationMin);
  const t = start.getTime();
  return slots.some((s) => s.start.getTime() === t);
}
