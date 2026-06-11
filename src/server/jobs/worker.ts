import { claimNext, completeJob, failJob } from "./queue";
import { runHandler } from "./handlers";

// In-process poller. Started once per Node server instance from
// instrumentation.ts (behind RUN_WORKER). Because claimNext() uses
// FOR UPDATE SKIP LOCKED, running this on every replica is safe.
const POLL_INTERVAL_MS = 5000;

let started = false;
let timer: NodeJS.Timeout | null = null;

export function startWorker(): void {
  if (started) return;
  started = true;
  console.log("[jobs] in-process worker started");
  scheduleTick();
}

export function stopWorker(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  started = false;
}

function scheduleTick(): void {
  timer = setTimeout(tick, POLL_INTERVAL_MS);
}

async function tick(): Promise<void> {
  try {
    // Drain everything currently runnable, then wait for the next interval.
    for (;;) {
      const job = await claimNext();
      if (!job) break;
      try {
        await runHandler(job);
        await completeJob(job.id);
      } catch (err) {
        console.error(
          `[jobs] ${job.type} (${job.id}) attempt ${job.attempts} failed:`,
          err,
        );
        await failJob(job, err instanceof Error ? err.message : String(err));
      }
    }
  } catch (err) {
    console.error("[jobs] worker tick error:", err);
  } finally {
    scheduleTick();
  }
}
