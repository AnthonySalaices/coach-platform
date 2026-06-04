#!/bin/sh
set -e

echo "→ Applying database migrations..."
node migrate.mjs

echo "→ Starting server on ${HOSTNAME}:${PORT}..."
exec node server.js
