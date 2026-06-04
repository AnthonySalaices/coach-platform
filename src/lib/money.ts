// Money is stored and moved as integer minor units (e.g. cents) + a currency
// code — never as a float. These helpers convert at the edges only.

/** 12.5 (USD) → 1250 */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

/** 1250 → 12.5 */
export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/** Format minor units for display, e.g. (1250, "usd") → "$12.50". */
export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}
