import type { Job } from "@/server/db/schema";

export type JobHandler = (job: Job) => Promise<void>;

/**
 * Registry of job type → handler. Real handlers land here as features are built
 * (e.g. "discord.provisionChannel", "email.sendReceipt"). A `noop` handler is
 * included so the queue is exercisable end-to-end right now.
 */
const handlers: Record<string, JobHandler> = {
  noop: async () => {},
};

export async function runHandler(job: Job): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) {
    throw new Error(`No handler registered for job type "${job.type}".`);
  }
  await handler(job);
}
