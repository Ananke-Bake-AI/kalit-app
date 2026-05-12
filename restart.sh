#!/usr/bin/env bash
# restart.sh — rebuild the landing app and hot-reload its PM2 process.
#
# Run on the production landing host (34.107.97.52) inside
# /opt/kalit-landing after pulling fresh source. PM2 keeps serving the
# previous .next/ folder if the build fails, so this is safe to retry —
# it never tears the live site down on its own.
#
# Usage: sh restart.sh
#
# Kept POSIX-shell-compatible (plain `set -e`, no pipefail/arrays) so
# `sh restart.sh` works under dash on Debian — matches the broker /
# taskforce restart.sh convention.

set -e

cd "$(dirname "$0")"

# Kill any orphaned `next build` left behind by a prior failed/cancelled
# run. Multiple concurrent builds race on the same `.next/static/*.tmp.<rand>`
# scratch files and produce intermittent ENOENT errors that LOOK like a
# Turbopack bug but are pure stale-process contention.
pkill -f "next/dist/bin/next build" 2>/dev/null || true
pkill -f "prisma generate" 2>/dev/null || true

# Source apps/landing/.env so values like BROKER_URL are visible during
# next.config.ts evaluation. Next.js auto-loads `.env` for runtime
# request handling, but next.config.ts runs BEFORE that loader — so any
# rewrite/redirect rule that reads `process.env.X` only sees what the
# parent shell exported. Without this, BROKER_URL fell back to
# `http://localhost:9000` and every /api/broker/* request 502'd.
ENV_FILE="apps/landing/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

echo "▶ pnpm install (workspace, frozen lockfile)"
pnpm install --frozen-lockfile || pnpm install

echo "▶ pnpm build @kalit/landing"
pnpm --filter @kalit/landing build

echo "▶ pm2 reload kalit-landing"
pm2 reload kalit-landing

pm2 ls
echo "✓ landing reloaded — port 3004"
