import { z } from "zod";

/**
 * Centralized, fail-fast environment validation. NOTHING in the app reads
 * `process.env` directly — everything imports `env` from here, so a missing or
 * malformed secret is caught once, loudly, at startup (see instrumentation.ts)
 * rather than as a mysterious runtime error mid-request.
 *
 * During `next build` we don't have runtime secrets, so set
 * `SKIP_ENV_VALIDATION=1` to bypass parsing for the build step only.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth.js — session signing + Discord OAuth (primary login).
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required (generate a strong random value)"),
  AUTH_TRUST_HOST: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  AUTH_DISCORD_ID: z.string().min(1),
  AUTH_DISCORD_SECRET: z.string().min(1),

  // Stripe — hosted Checkout + signed webhooks. Never handle raw card data.
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),

  // Discord bot (provisioning) — optional: the bot module is a stub for now,
  // so the app runs without it. Required only once provisioning is enabled.
  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),

  // In-process job worker. Default on; set RUN_WORKER=false on instances that
  // should only serve HTTP (e.g. when running a dedicated worker elsewhere).
  RUN_WORKER: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

const publicSchema = z.object({
  // The app's public origin, e.g. https://coach.example.com. Used to build
  // Stripe success/cancel URLs and absolute links.
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const fullSchema = serverSchema.and(publicSchema);

export type Env = z.infer<typeof serverSchema> & z.infer<typeof publicSchema>;

function buildEnv(): Env {
  // Skip during the build step, which has no runtime secrets.
  if (process.env.SKIP_ENV_VALIDATION) {
    return process.env as unknown as Env;
  }

  const parsed = fullSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    console.error(`\n❌ Invalid environment variables:\n${issues}\n`);
    throw new Error("Invalid environment variables — see the list above.");
  }
  return parsed.data;
}

export const env = buildEnv();
