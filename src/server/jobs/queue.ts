import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs, type Job } from "@/server/db/schema";

export async function enqueue(
  type: string,
  payload: Record<string, unknown> = {},
  opts: { runAt?: Date; maxAttempts?: number } = {},
): Promise<Job> {
  const [row] = await db
    .insert(jobs)
    .values({
      type,
      payload,
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 5,
    })
    .returning();
  return row!;
}

/**
 * Atomically claim the next runnable job and mark it `running`. The inner
 * `SELECT ... FOR UPDATE SKIP LOCKED` means concurrent workers (across multiple
 * app instances) never grab the same row — that's what makes the in-process
 * worker safe to run on every replica without Redis.
 */
export async function claimNext(): Promise<Job | undefined> {
  const next = db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.status, "pending"), lte(jobs.runAt, sql`now()`)))
    .orderBy(jobs.runAt)
    .limit(1)
    .for("update", { skipLocked: true });

  const [row] = await db
    .update(jobs)
    .set({
      status: "running",
      lockedAt: new Date(),
      attempts: sql`${jobs.attempts} + 1`,
    })
    .where(inArray(jobs.id, next))
    .returning();
  return row;
}

export async function completeJob(id: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: "done", lockedAt: null, lastError: null })
    .where(eq(jobs.id, id));
}

/** Reschedule with exponential backoff, or mark `failed` once attempts run out. */
export async function failJob(job: Job, error: string): Promise<void> {
  const exhausted = job.attempts >= job.maxAttempts;
  await db
    .update(jobs)
    .set({
      status: exhausted ? "failed" : "pending",
      lastError: error.slice(0, 1000),
      lockedAt: null,
      runAt: exhausted
        ? job.runAt
        : new Date(Date.now() + backoffMs(job.attempts)),
    })
    .where(eq(jobs.id, job.id));
}

function backoffMs(attempts: number): number {
  // 2^attempts seconds, capped at 5 minutes.
  return Math.min(2 ** attempts * 1000, 5 * 60 * 1000);
}
