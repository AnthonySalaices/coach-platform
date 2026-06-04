import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// Single shared connection pool. Cached on globalThis in dev so HMR doesn't
// open a new pool on every reload. The app holds no other local state, so any
// number of instances can run against the same Postgres (statelessness).
const globalForDb = globalThis as unknown as {
  __dbClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__dbClient ?? postgres(env.DATABASE_URL, { max: 10 });

if (env.NODE_ENV !== "production") {
  globalForDb.__dbClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type Database = typeof db;

/** A transaction handle (same query API as `db`). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
