// Next.js runs `register()` once when the server boots.
export async function register(): Promise<void> {
  // Importing env here validates every required secret at startup — the process
  // fails loudly and immediately if configuration is missing/malformed.
  const { env } = await import("@/env");

  // Start the in-process job worker only in the Node.js runtime (never edge),
  // and only where enabled. SKIP it during build.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    !process.env.SKIP_ENV_VALIDATION &&
    env.RUN_WORKER
  ) {
    const { startWorker } = await import("@/server/jobs/worker");
    startWorker();
  }
}
