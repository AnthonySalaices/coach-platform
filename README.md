# Coaching Platform

An open-source, **self-hostable** coaching platform for gamers. You run your own
instance — one instance is one coaching business. The project authors never host
it and never touch your money: payments go straight to **your** Stripe account.

> **Status: fully working.** Booking, payments, scheduling, dashboards, the
> Discord session bot, and admin customization are all live. Still on the
> wishlist: per-coach timezones and email notifications.

## What you get

- **Public landing page** with your coach roster, bookable services and a
  "tactical terminal" look — every color, the logo, and every line of text is
  editable from the admin settings, no rebuild needed.
- **Discord sign-in** on a branded page (clients book with the same account
  they'll be coached on), with role-based client / coach / admin dashboards.
- **Booking & scheduling** — coaches set weekly availability windows; clients
  pick from real open slots (timezone-aware, conflict-checked) and pay through
  Stripe-hosted Checkout. Refunds flow back automatically via webhook.
- **A Discord bot that runs the session**: when a booking is paid it creates a
  private text channel for the coach with the booking briefing and a button to
  optionally let the client in early; at start time it adds the client, pings
  both, and opens a private voice channel only the two of them can see; after
  the session it cleans the voice channel up (once it's empty) and leaves the
  text channel for follow-ups. Clients who aren't in your server yet get an
  invite link handled for you.
- **Admin tools** — manage users/roles, view all bookings, impersonate ("view
  as") for support, rebrand the site (name, logo, full color scheme, all site
  copy), and a **step-by-step bot demo page** that walks the whole Discord
  lifecycle on a throwaway booking so you can see each stage fire for real.
- **Reviews** — clients rate sessions; ratings show on the public roster.

## Stack

- **Next.js** (App Router) + **TypeScript** end to end
- **Postgres** via **Drizzle ORM** (data access kept thin so a SQLite "solo
  mode" can be added later)
- **Auth.js** with **Discord** login, stateless **JWT** sessions
- **Stripe** hosted Checkout + a signature-verified, idempotent webhook
- **discord.js** bot for private per-session text/voice channels
- **DB-backed** background jobs (no Redis)
- **Docker Compose** (app + Postgres) behind **Caddy** for automatic HTTPS

## Self-hosting (the short version)

You need a server (any cheap VPS) with **Docker** installed, and a **domain
name** you can point at it.

### 1. Get the code

```bash
git clone <your-fork-url> coach-platform
cd coach-platform
```

### 2. Create your config

```bash
cp .env.example .env
```

Open `.env` and fill in every value. You'll need accounts for:

- **Discord** — create an application at
  <https://discord.com/developers/applications>, grab the OAuth2 **Client ID**
  and **Client Secret**, and add the redirect URL
  `https://YOUR-DOMAIN/api/auth/callback/discord`.
- **Discord bot** (same application, optional but recommended — it powers the
  session channels): on the **Bot** tab, reset & copy the **token** into
  `DISCORD_BOT_TOKEN`. Invite the bot to your server via
  `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=268438545`
  (Manage Channels, Manage Roles, Create Invite, View, Send) and put your
  server id in `DISCORD_GUILD_ID`. Optionally set
  `DISCORD_SESSIONS_CATEGORY_ID` to keep session channels under one category.
  Verify it end-to-end from **Dashboard → Admin → Discord bot**.
- **Stripe** — from the Dashboard, copy your **secret key**, then add a webhook
  endpoint at `https://YOUR-DOMAIN/api/webhooks/stripe` and copy its **signing
  secret**.
- A strong `AUTH_SECRET` — generate one with `openssl rand -base64 33`.
- Set `DOMAIN`, `ACME_EMAIL`, and `NEXT_PUBLIC_APP_URL` to your domain.

> Without `DISCORD_BOT_TOKEN` / `DISCORD_GUILD_ID` everything else still works —
> session channels just don't get created. Everything else is required.

### 3. Point your domain at the server

Create a DNS **A record** for your domain pointing to your server's IP address.
Caddy will fetch a real HTTPS certificate automatically the first time it starts.

### 4. Start it

```bash
docker compose up -d --build
```

That's it. The app container runs database migrations on startup, then serves
the site; Caddy terminates HTTPS and proxies to it. Visit `https://YOUR-DOMAIN`.

Check health any time:

```bash
curl https://YOUR-DOMAIN/api/health     # {"status":"ok","db":"up"}
```

## Local development

```bash
npm install
cp .env.example .env          # point DATABASE_URL at a local Postgres
npm run db:migrate            # apply the schema
npm run dev                   # http://localhost:3000
```

Useful scripts:

| Script                | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Dev server                               |
| `npm run build`       | Production build                         |
| `npm run lint`        | ESLint                                   |
| `npm run format`      | Prettier (write)                         |
| `npm run typecheck`   | `tsc --noEmit`                           |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate`  | Apply migrations                         |
| `npm run db:studio`   | Drizzle Studio (browse the DB)           |

Test Stripe webhooks locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

## Security notes

- **No secrets in code** — everything comes from `.env`, validated at startup.
- **No raw card data ever** — Stripe-hosted Checkout only.
- **Webhooks are verified** (Stripe signature) and **idempotent** (each event is
  processed once, even on retries/replays).
- **Authorization is enforced** — clients can only access their own bookings;
  coach and admin roles are distinct.

## Scaling

The app process is **stateless** (JWT sessions, jobs live in Postgres and are
claimed with `FOR UPDATE SKIP LOCKED`, payment state lives in Stripe). To scale,
run more `app` replicas against the same Postgres — no shared session store, no
Redis. Postgres is the only stateful component.

## License

MIT (see `LICENSE`).
