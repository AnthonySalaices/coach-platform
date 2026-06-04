# syntax=docker/dockerfile:1

# ── deps: install all dependencies (incl. dev — needed for the build) ─────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: produce the standalone app + a self-contained migration runner ───
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# No runtime secrets at build time — env is validated at startup instead.
ENV SKIP_ENV_VALIDATION=1
RUN npm run build
# Bundle the migrator into a single file so the runtime image needs no dev deps.
RUN npx esbuild src/server/db/migrate.ts \
    --bundle --platform=node --target=node22 --format=esm \
    --outfile=migrate.mjs

# ── runner: minimal production image ──────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Next standalone server + static assets.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Migrations + bundled runner + entrypoint.
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/migrate.mjs ./migrate.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 3000

# Runs migrations, then starts the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
