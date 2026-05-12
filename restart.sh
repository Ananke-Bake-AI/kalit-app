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

echo "▶ pnpm install (workspace, frozen lockfile)"
pnpm install --frozen-lockfile || pnpm install

echo "▶ pnpm build @kalit/landing"
pnpm --filter @kalit/landing build

echo "▶ pm2 reload kalit-landing"
pm2 reload kalit-landing

pm2 ls
echo "✓ landing reloaded — port 3004"
