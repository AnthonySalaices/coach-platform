# AGENTS.md — Coaching Platform

Context sheet for AI sessions working on this repo. Keep it current as the app evolves.

## What this is

An open-source, **self-hostable** coaching platform for gamers. Each deployment is
**one independent coaching business** — the author never hosts it and never touches
money (payments go straight to the deployer's own Stripe account). Deployers include
non-technical "normies", so the deploy story must stay dead simple.

Priorities, in order: **lightweight → secure (it handles payments) → easy to
self-host → stateless (so it scales if a larger org adopts it).**

Repo: `github.com/AnthonySalaices/coach-platform` (public, MIT). Single Next.js app.

## Stack & conventions

- **Next.js (App Router) + TypeScript**, `output: "standalone"`. React server
  components by default; client components only where the browser is needed
  (local-time rendering, interactive forms).
- **Drizzle ORM + Postgres**. All DB access goes through `src/server/db/repos/*`
  (thin data layer) so a future SQLite "solo mode" is a driver swap. Parameterized
  queries only — never string-built SQL.
- **Auth.js v5** (Discord OAuth, **JWT** sessions). **Stripe** hosted Checkout.
  **discord.js** (session channel bot). **Zod** at every API/action boundary.
- **Money** is always integer **minor units** + a currency code. Never floats.
- **Time** is stored/computed in **UTC** end-to-end; it's rendered in the viewer's
  **browser timezone** by client components. See "Timezone" below.
- Path alias `@/* → src/*`. Server actions live next to their page in `actions.ts`.
- Match the surrounding code's density/idiom; comments explain *why*, not *what*.

## Routes / pages

- `/` — public marketing landing (hero, how-it-works, coaches grouped by game with
  ratings). Auth-aware nav. Works signed out.
- `/dashboard` — role-aware shell (`layout.tsx` guards + nav + topbar). Overview,
  and role sections:
  - **Client:** `/dashboard/client` (upcoming/past bookings + leave reviews).
  - **Coach:** `/dashboard/coach` (edit bio/games, manage availability, services,
    sessions).
  - **Admin:** `/dashboard/admin/{users,bookings,settings}`.
  - Shared: `/dashboard/coaches` (browse) → `/dashboard/coaches/[coachId]` (profile
    + bookable slots), `/dashboard/bookings/[id]` (booking detail).
- API: `/api/auth/[...nextauth]`, `/api/webhooks/stripe` (Node runtime, signed),
  `/api/health`, `/api/checkout` (legacy programmatic helper).

## Architecture / key files

```
src/
  env.ts                  zod-validated env, fail-fast (SKIP_ENV_VALIDATION at build)
  instrumentation.ts      startup: validate env, boot job worker (RUN_WORKER)
  middleware?             none — guards run in layouts/pages/actions
  app/                    pages + route handlers + server actions (actions.ts)
  components/             Avatar, BookingsTable, LocalTime, SlotPicker,
                          AvailabilityManager (client islands for tz + interactivity)
  lib/
    page-auth.ts          requirePageUser/requirePageRole (effective identity, redirect)
    view-as.ts            admin impersonation (effective identity resolver)
    view-as-actions.ts    start/stop "view as"
    http.ts               HttpError + toErrorResponse (route handlers)
    money.ts              minor-unit helpers
  server/
    db/  index.ts (pool + Tx type) · schema.ts · migrate.ts · repos/*
    auth/ index.ts (Auth.js config) · guards.ts (requireUser/Role + booking authz)
    payments/ stripe.ts (lazy) · checkout.ts · fulfillment.ts (tx-aware) · webhook.ts
    scheduling/ slots.ts (computeSlots + availableSlotsForService + isSlotAvailable)
    discord/ client.ts (lazy gateway bot) · provisioning.ts · interactions.ts
    jobs/ queue.ts (FOR UPDATE SKIP LOCKED) · worker.ts · handlers.ts
    validation/ zod schemas
drizzle/                  generated migrations
scripts/                  seed-*.sql (demo data) · photo? no
Dockerfile · docker-compose.yml · Caddyfile · .env.example
```

## Data model (Postgres / Drizzle, `schema.ts`)

- Auth.js tables: `users` (extended with `role` enum client|coach|admin, `discord_id`),
  `accounts`, `sessions`, `verification_tokens`.
- `coach_profiles` (bio, games[], showcase_links[], default_currency).
- `services` (coach_id, title, duration_min, price minor-units, currency, active).
- `availability` — flexible: `type` recurring|exception. Recurring `rule` =
  `{weekday, startMinute, endMinute}` (minutes-from-**UTC**-midnight; end may exceed
  1440 if it crosses UTC midnight). Exceptions use `starts_at`/`ends_at` (time off).
- `bookings` (client_id, coach_id, service_id, start_at, end_at, status enum
  pending|confirmed|completed|cancelled|refunded, **stripe_payment_intent_id**
  UNIQUE = the webhook's idempotent join key, discord_channel_id).
- `payments` (1:1 booking, payment_intent_id, amount, currency, status, refunded_amount).
- `reviews` (1 per booking; client rates a completed session; coach avg shown on cards).
- `processed_stripe_events` (event id ledger for webhook idempotency).
- `jobs` (DB-backed queue), `settings` (key/value, e.g. editable `site_name`).

## Auth & authorization

- Discord OAuth, **JWT** session strategy (stateless: role baked into the token at
  sign-in, no per-request DB read). Secure cookies (httpOnly, secure in prod,
  sameSite=lax). `discord_id` backfilled in `events.linkAccount` (NOT the signIn
  callback — there `user.id` is the Discord snowflake, not our DB id).
- **`ADMIN_DISCORD_IDS`** (comma-separated) auto-grants admin on sign-in — the
  first-admin bootstrap for a fresh instance.
- **Guards** (`lib/page-auth.ts`, `server/auth/guards.ts`): `requirePageRole`,
  per-booking ownership (`assertBookingAccess`) — a client can't read/cancel another's
  booking; coach/admin distinct. Server actions re-check authz (defense in depth).
- **"View as"** (admin impersonation): cookie-based effective identity, honored ONLY
  when the real user is an admin. Page rendering + guards use the effective user; a
  banner with Exit shows while impersonating.

## Payments

- Stripe **hosted Checkout** only — never touch card data. Price/title/currency are
  read from the Service row server-side (never trusted from the client).
- Webhook (`/api/webhooks/stripe`, Node runtime): verifies the signature, then in ONE
  transaction claims the event id in `processed_stripe_events` (idempotent) and runs
  `fulfillment.ts` (`confirmBookingPaid` / `refundBooking`) — booking→confirmed,
  payment row, enqueue `discord.provisionChannel` job. Fulfillment is itself
  idempotent (only promotes `pending`, only enqueues once).
- **`DEV_BYPASS_PAYMENTS`** (dev only, hard-disabled when `NODE_ENV=production`):
  instantly confirms a booking so the flow is clickable without Stripe keys.

## Scheduling & timezone

- **Back-end is pure UTC.** `slots.ts` expands coach weekly windows for the next 14
  days, minus exceptions, existing bookings, and the past → absolute UTC slot
  instants. Booking re-validates the chosen slot server-side (`isSlotAvailable`).
- **Front-end renders in the viewer's browser timezone** via client components:
  `LocalTime` (display), `SlotPicker` (groups slots by local day), and
  `AvailabilityManager` (coach enters local hours → converted to UTC weekday/minutes;
  displays back in local). DST handled by anchoring the recurring-hours display to the
  current week. **Do not reintroduce server-side local formatting** — the server's
  host timezone is arbitrary.

## Jobs & Discord

- DB-backed queue, claimed with `SELECT … FOR UPDATE SKIP LOCKED` so every app replica
  can run the in-process worker safely (no Redis). Worker starts from
  `instrumentation.ts` behind `RUN_WORKER`.
- Every `discord.*` handler **no-ops when Discord isn't configured**
  (`isDiscordConfigured()`), so the queue stays green without a bot.
- **Session lifecycle** (all in `discord/provisioning.ts`, driven by jobs):
  - `discord.provisionChannel` (enqueued by fulfillment on the pending→confirmed
    transition): creates a private text channel (`session-<id8>`, coach + bot only;
    under `DISCORD_SESSIONS_CATEGORY_ID` if set), posts the booking briefing embed
    with an **"add client" button**, persists `bookings.discord_channel_id`, then
    enqueues `discord.sessionStart` with `runAt = start_at`.
  - The button (customId `cp:addclient:<bookingId>`, handled in
    `discord/interactions.ts` via the gateway) lets **only the coach** open the
    channel to the client early. Overwrites are created from a fetched `User`, so
    they work before the client joins the guild; if the client isn't a member yet
    the coach gets an ephemeral one-off **invite link** to pass along.
  - `discord.sessionStart` (at start time; skips cancelled/refunded or already-ended
    bookings): ensures client access, creates a **private voice channel** (reused on
    retry via `bookings.discord_voice_channel_id`), pings both participants with a
    kickoff embed linking `<#voice>`, and enqueues `discord.sessionEnd` at
    `end_at + 30min`.
  - `discord.sessionEnd`: deletes the voice channel; if people are still connected
    it re-enqueues itself every 30min until a 6h hard cap, then force-deletes. The
    text channel stays (follow-ups/homework).
- The bot logs in eagerly at boot from `instrumentation.ts` (`startDiscordBot()`)
  so the button works after restarts; everywhere else the client stays lazy.
  Needed guild perms: Manage Channels, Manage Roles, Create Invite, View, Send.

## Security non-negotiables

- No secrets in code — all via `env.ts`, validated at startup. Never touch card data
  (hosted Checkout only). Webhooks signature-verified + idempotent. Parameterized
  queries only. Authorization enforced on every protected route + server action.
  Secure cookies. `.env*` git-ignored (only `.env.example` tracked).

## Env vars (see `.env.example`)

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`/`AUTH_TRUST_HOST`, `AUTH_DISCORD_ID/SECRET`,
`ADMIN_DISCORD_IDS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_NAME`, `DISCORD_BOT_TOKEN`,
`DISCORD_GUILD_ID`, `DISCORD_SESSIONS_CATEGORY_ID` (optional), `RUN_WORKER`, `DEV_BYPASS_PAYMENTS` (dev only), `DOMAIN`,
`ACME_EMAIL`, Postgres creds for compose.

## Deploy / dev

- **Production:** `docker compose up -d --build` → app + Postgres + **Caddy**
  (automatic HTTPS for `DOMAIN`). The app entrypoint runs migrations (esbuild-bundled
  `migrate.mjs`) then `node server.js`. Point a domain's A record at the host.
- **Reverse proxy note:** when fronting with a proxy (Caddy/nginx/NPM), set `AUTH_URL`
  + `NEXT_PUBLIC_APP_URL` to the public `https://` origin and register
  `https://<domain>/api/auth/callback/discord` in the Discord app. Discord requires
  https for non-localhost redirects.
- **Dev:** `npm run dev`. `npm run db:generate` / `db:migrate`. `npm run build` must
  pass before deploy.

## Gotchas

- `env.ts` parses eagerly → set `SKIP_ENV_VALIDATION=1` for `next build` (the
  Dockerfile does). Anything reading the DB at build (e.g. `getSiteName` in the root
  `generateMetadata`) must degrade gracefully — it already try/catches.
- The Stripe client is **lazy** (`getStripe()`) — constructing at module load breaks
  the build (no secret then).
- ESLint is a hand-rolled flat config (`@next/eslint-plugin-next` + `typescript-eslint`);
  `eslint-config-next` via FlatCompat crashes on ESLint 9.
- After deleting a route, `.next/types` can hold a stale reference → `rm -rf .next`
  before typecheck.
- discord.js / postgres are `serverExternalPackages`. geoip-style data files: n/a here.

## Current status

Foundation + core product built and green (typecheck/lint/build): auth + roles +
admin "view as", Stripe booking flow + idempotent webhook fulfillment, scheduling
(availability → bookable slots) with full browser-timezone rendering, reviews,
editable branding, fonts + avatars, admin-by-Discord-id bootstrap. Demo data via
`scripts/seed-*.sql`.

**Stubbed / next:** real Discord channel provisioning (`discord/provisioning.ts`);
per-coach timezones (currently viewer-local only); email/notifications; richer
free-agent/scheduling UX; SQLite "solo mode".
