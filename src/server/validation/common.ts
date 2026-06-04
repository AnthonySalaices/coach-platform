import { z } from "zod";

/** Reusable primitives for request validation at API boundaries. */
export const id = z.string().min(1).max(64);
export const currencyCode = z
  .string()
  .length(3)
  .toLowerCase()
  .describe("ISO 4217 currency code, e.g. 'usd'");
