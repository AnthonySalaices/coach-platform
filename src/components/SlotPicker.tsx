"use client";

import { useEffect, useState } from "react";
import { startBooking } from "@/app/dashboard/coaches/[coachId]/actions";

// Groups available slots by day and labels times — all in the viewer's local
// timezone. Before mount it formats in UTC (deterministic SSR), then re-groups
// locally. The slot values posted to the server are absolute UTC ISO strings.
export function SlotPicker({
  serviceId,
  slots,
}: {
  serviceId: string;
  slots: string[];
}) {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);

  const tz = local ? undefined : "UTC";
  const dayFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });

  const groups: { day: string; items: { iso: string; label: string }[] }[] = [];
  const byDay = new Map<string, number>();
  for (const iso of slots) {
    const d = new Date(iso);
    const day = dayFmt.format(d);
    if (!byDay.has(day)) {
      byDay.set(day, groups.length);
      groups.push({ day, items: [] });
    }
    groups[byDay.get(day)!]!.items.push({ iso, label: timeFmt.format(d) });
  }

  return (
    <div>
      <div className="avail-label">Available times · your timezone</div>
      {groups.map((g) => (
        <div className="slot-day" key={g.day}>
          <div className="slot-day-label">{g.day}</div>
          <div className="slot-row">
            {g.items.map((it) => (
              <form action={startBooking} key={it.iso}>
                <input type="hidden" name="serviceId" value={serviceId} />
                <input type="hidden" name="startAt" value={it.iso} />
                <button className="slot-btn" type="submit">
                  {it.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
