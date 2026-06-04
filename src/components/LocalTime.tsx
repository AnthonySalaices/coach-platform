"use client";

import { useEffect, useState } from "react";

type Mode = "datetime" | "time" | "day" | "full";

const OPTS: Record<Mode, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: "medium", timeStyle: "short" },
  time: { hour: "numeric", minute: "2-digit" },
  day: { weekday: "long", month: "short", day: "numeric" },
  full: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
};

function fmt(value: string | number, mode: Mode, tz?: string): string {
  const opts = tz ? { ...OPTS[mode], timeZone: tz } : OPTS[mode];
  return new Date(value).toLocaleString("en-US", opts);
}

/**
 * Renders a UTC instant in the *viewer's* timezone. SSR + first client render
 * use UTC (deterministic → no hydration mismatch); after mount it swaps to the
 * browser's local timezone. The DB/back-end stays pure UTC.
 */
export function LocalTime({
  value,
  mode = "datetime",
}: {
  value: string | number;
  mode?: Mode;
}) {
  const [text, setText] = useState(() => fmt(value, mode, "UTC"));
  useEffect(() => setText(fmt(value, mode)), [value, mode]);
  return (
    <time suppressHydrationWarning dateTime={new Date(value).toISOString()}>
      {text}
    </time>
  );
}
