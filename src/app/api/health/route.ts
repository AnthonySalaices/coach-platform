import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness + DB reachability, used by the container healthcheck.
export async function GET(): Promise<Response> {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
