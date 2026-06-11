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

  // Discord bot (session provisioning) — optional: without a token the app
  // runs fine and provisioning jobs no-op. With it, the bot creates a private
  // text channel per booking, adds the client at session start, and spins up
  // a session voice channel. Needs: Manage Channels, Manage Roles, Create
  // Invite, View/Send in the guild.
  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().min(1).optional(),
  // Optional category (channel folder) id to create session channels under.
  DISCORD_SESSIONS_CATEGORY_ID: z.string().min(1).optional(),

  // In-process job worker. Default on; set RUN_WORKER=false on instances that
  // should only serve HTTP (e.g. when running a dedicated worker elsewhere).
  RUN_WORKER: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // DEV ONLY: skip Stripe and instantly confirm bookings (to demo the flow
  // without real keys). Hard-disabled when NODE_ENV=production — see usage.
  DEV_BYPASS_PAYMENTS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Comma-separated Discord user ids that are auto-granted admin on sign-in.
  // Use it to bootstrap the first admin of a fresh instance.
  ADMIN_DISCORD_IDS: z.string().optional(),
});

const publicSchema = z.object({
  // The app's public origin, e.g. https://coach.example.com. Used to build
  // Stripe success/cancel URLs and absolute links.
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // Default site/brand name. The admin can override this in-app (Settings),
  // which takes precedence over this default.
  NEXT_PUBLIC_SITE_NAME: z.string().default("GG Coach"),
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
