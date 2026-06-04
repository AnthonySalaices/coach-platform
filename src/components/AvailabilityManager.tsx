"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addRecurringAvailability,
  addUnavailabilityPeriod,
  deleteAvailabilitySlot,
} from "@/app/dashboard/coach/actions";

export interface RecurringRow {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}
export interface ExceptionRow {
  id: string;
  startISO: string;
  endISO: string;
}

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
// ── conversions (browser-local ⇆ UTC) ───────────────────────────────────────
// Anchor recurring-window display to THIS week's UTC Sunday so the local offset
// (incl. DST) matches now — a fixed reference date would drift an hour across a
// DST boundary.
function thisWeekSundayUtcMid(): number {
  const now = new Date();
  const utcMid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return utcMid - new Date(utcMid).getUTCDay() * 86_400_000;
}

function windowInstants(r: RecurringRow): { start: Date; end: Date } {
  const mid = thisWeekSundayUtcMid() + r.weekday * 86_400_000;
  return {
    start: new Date(mid + r.startMinute * 60_000),
    end: new Date(mid + r.endMinute * 60_000),
  };
}

function localRecurringToUtc(localWeekday: number, from: string, to: string) {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const now = new Date();
  const delta = (localWeekday - now.getDay() + 7) % 7;
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
  const s = new Date(base.getFullYear(), base.getMonth(), base.getDate(), fh, fm);
  const e = new Date(base.getFullYear(), base.getMonth(), base.getDate(), th, tm);
  const utcMidnight = Date.UTC(
    s.getUTCFullYear(),
    s.getUTCMonth(),
    s.getUTCDate(),
  );
  return {
    weekday: s.getUTCDay(),
    startMinute: Math.round((s.getTime() - utcMidnight) / 60_000),
    endMinute: Math.round((e.getTime() - utcMidnight) / 60_000),
  };
}

function localUnavailToUtc(
  date: string,
  allDay: boolean,
  from: string,
  to: string,
) {
  const [y, mo, d] = date.split("-").map(Number);
  const start = allDay
    ? new Date(y, mo - 1, d, 0, 0)
    : new Date(y, mo - 1, d, ...(from.split(":").map(Number) as [number, number]));
  const end = allDay
    ? new Date(y, mo - 1, d + 1, 0, 0)
    : new Date(y, mo - 1, d, ...(to.split(":").map(Number) as [number, number]));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function AvailabilityManager({
  recurring,
  exceptions,
}: {
  recurring: RecurringRow[];
  exceptions: ExceptionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  // recurring form
  const [rWeekday, setRWeekday] = useState(1);
  const [rFrom, setRFrom] = useState("09:00");
  const [rTo, setRTo] = useState("17:00");

  // unavailability form
  const [uDate, setUDate] = useState("");
  const [uAllDay, setUAllDay] = useState(true);
  const [uFrom, setUFrom] = useState("12:00");
  const [uTo, setUTo] = useState("13:00");

  const wdFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: mounted ? undefined : "UTC",
  });
  const tFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: mounted ? undefined : "UTC",
  });
  const fullFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: mounted ? undefined : "UTC",
  });

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function addRecurring() {
    const { weekday, startMinute, endMinute } = localRecurringToUtc(
      rWeekday,
      rFrom,
      rTo,
    );
    if (endMinute <= startMinute) return setError("End must be after start.");
    const fd = new FormData();
    fd.set("weekday", String(weekday));
    fd.set("startMinute", String(startMinute));
    fd.set("endMinute", String(endMinute));
    run(() => addRecurringAvailability(fd));
  }

  function addUnavail() {
    if (!uDate) return setError("Pick a date.");
    const { start, end } = localUnavailToUtc(uDate, uAllDay, uFrom, uTo);
    if (new Date(end) <= new Date(start))
      return setError("End must be after start.");
    const fd = new FormData();
    fd.set("start", start);
    fd.set("end", end);
    run(() => addUnavailabilityPeriod(fd));
  }

  function remove(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    run(() => deleteAvailabilitySlot(fd));
  }

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <strong>Availability</strong>
      <p
        className="muted"
        style={{ fontSize: "0.8rem", margin: "0.25rem 0 0.75rem" }}
      >
        Shown in your timezone. Clients see open slots from your weekly hours,
        minus time off and booked sessions.
      </p>

      {error && (
        <p style={{ color: "#e5707e", fontSize: "0.85rem" }}>{error}</p>
      )}

      {/* weekly hours */}
      <div className="avail-label">Weekly hours</div>
      {recurring.length === 0 && (
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          No weekly hours yet.
        </p>
      )}
      <ul className="avail-list">
        {recurring.map((r) => {
          const { start, end } = windowInstants(r);
          return (
            <li key={r.id}>
              <span>
                {wdFmt.format(start)} · {tFmt.format(start)} – {tFmt.format(end)}
              </span>
              <button
                className="btn-x"
                type="button"
                title="Remove"
                disabled={pending}
                onClick={() => remove(r.id)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <div className="avail-form">
        <select
          className="input"
          value={rWeekday}
          onChange={(e) => setRWeekday(Number(e.target.value))}
        >
          {WEEKDAYS_LONG.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          className="input"
          value={rFrom}
          onChange={(e) => setRFrom(e.target.value)}
        />
        <span className="muted">to</span>
        <input
          type="time"
          className="input"
          value={rTo}
          onChange={(e) => setRTo(e.target.value)}
        />
        <button
          className="btn"
          type="button"
          disabled={pending}
          onClick={addRecurring}
        >
          Add hours
        </button>
      </div>

      {/* time off */}
      <div className="avail-label" style={{ marginTop: "1rem" }}>
        Time off
      </div>
      {exceptions.length === 0 && (
        <p className="muted" style={{ margin: "0.25rem 0" }}>
          None.
        </p>
      )}
      <ul className="avail-list">
        {exceptions.map((x) => (
          <li key={x.id}>
            <span suppressHydrationWarning>
              {fullFmt.format(new Date(x.startISO))} →{" "}
              {fullFmt.format(new Date(x.endISO))}
            </span>
            <button
              className="btn-x"
              type="button"
              title="Remove"
              disabled={pending}
              onClick={() => remove(x.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="avail-form">
        <label className="muted" style={{ fontSize: "0.85rem" }}>
          Block off
        </label>
        <input
          type="date"
          className="input"
          value={uDate}
          onChange={(e) => setUDate(e.target.value)}
        />
        <label
          className="muted"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.85rem",
          }}
        >
          <input
            type="checkbox"
            checked={uAllDay}
            onChange={(e) => setUAllDay(e.target.checked)}
          />
          All day
        </label>
        {!uAllDay && (
          <>
            <input
              type="time"
              className="input"
              value={uFrom}
              onChange={(e) => setUFrom(e.target.value)}
            />
            <span className="muted">to</span>
            <input
              type="time"
              className="input"
              value={uTo}
              onChange={(e) => setUTo(e.target.value)}
            />
          </>
        )}
        <button
          className="btn"
          type="button"
          disabled={pending}
          onClick={addUnavail}
        >
          Block off
        </button>
      </div>
    </div>
  );
}
