#!/usr/bin/env bash
# restart.sh — rebuild the landing app and hot-reload its PM2 process.
#
# Run on the production landing host (34.107.97.52) inside
# /opt/kalit-landing after pulling fresh source. PM2 keeps serving the
# previous .next/ folder if the build fails, so this is safe to retry —
# it never tears the live site down on its own.
#
# Usage:
#   sh restart.sh                       # standard deploy
#   sh restart.sh --force-dirty         # proceed even if working tree dirty
#   sh restart.sh --no-lock             # skip the mutex (use only when you
#                                       # KNOW you're the sole deployer)
#
# Kept POSIX-shell-compatible (plain `set -e`, no pipefail/arrays) so
# `sh restart.sh` works under dash on Debian — matches the broker /
# taskforce restart.sh convention.

set -e

# Resolve our own absolute path BEFORE the flock re-exec — `flock`
# uses execvp() which searches PATH, and "." is virtually never in
# PATH, so re-execing with `$0` (commonly "restart.sh") fails with
# ENOENT. Compute it here so both the initial run and the post-flock
# re-exec point at the same file.
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$SELF")"

FORCE_DIRTY=0
USE_LOCK=1
for arg in "$@"; do
  case "$arg" in
    --force-dirty) FORCE_DIRTY=1 ;;
    --no-lock)     USE_LOCK=0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# ────────────────────────────────────────────────────────────────────
# 1. Single-deployer mutex
# ────────────────────────────────────────────────────────────────────
# Two agents (or two humans, or one of each) calling `restart.sh`
# concurrently used to race on `.next/static/*.tmp.<random>` files and
# produce cascading ENOENT failures that looked like Turbopack bugs.
# A simple flock turns that into a queue: the second caller waits for
# the first to finish, then runs cleanly.
#
# If flock is unavailable (dash on stripped-down images), we fall back
# to a process check — refuse to start if another build is alive.
LOCK_FILE="/var/lock/kalit-landing-deploy.lock"
if [ "$USE_LOCK" = "1" ] && command -v flock >/dev/null 2>&1; then
  # Re-exec under flock if not already holding it.
  if [ -z "${KALIT_DEPLOY_LOCK_HELD:-}" ]; then
    echo "▶ acquiring deploy lock ($LOCK_FILE)…"
    export KALIT_DEPLOY_LOCK_HELD=1
    # -w 1800 → wait up to 30 min (long Next.js builds + pnpm install).
    # Exit code 1 from flock means "lock not acquired in time".
    exec flock -x -w 1800 "$LOCK_FILE" "$SELF" "$@"
  fi
  echo "▶ deploy lock held by this process"
elif [ "$USE_LOCK" = "1" ]; then
  # No flock — best-effort process check. Kills my own duplicates only.
  if pgrep -f "$SELF" | grep -v "^$$\$" >/dev/null 2>&1; then
    echo "✗ another restart.sh appears to be running (no flock available)" >&2
    echo "  rerun with --no-lock once you've confirmed it's safe." >&2
    exit 1
  fi
fi

# ────────────────────────────────────────────────────────────────────
# 2. Refuse to overwrite uncommitted edits on the server
# ────────────────────────────────────────────────────────────────────
# Anyone editing `/opt/kalit-landing` directly via SSH (the other-agent
# scenario we hit on 2026-05-12) used to surface as "git pull aborted —
# overwritten by merge" or, worse, as a silent `git stash -u` that
# swallowed untracked operational files like `start-landing.sh`. The
# safer default is to bail loudly with the file list so a human can
# decide. Pass `--force-dirty` to acknowledge and bulldoze through.
if [ "$FORCE_DIRTY" != "1" ]; then
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "✗ working tree dirty — refusing to deploy." >&2
    echo "  files:" >&2
    git status --porcelain | sed 's/^/    /' >&2
    echo "" >&2
    echo "  options:" >&2
    echo "    - inspect: git diff / git stash show -p stash@{0}" >&2
    echo "    - commit + push them to git, OR" >&2
    echo "    - sh restart.sh --force-dirty   (bulldozes — last resort)" >&2
    exit 1
  fi
fi

# ────────────────────────────────────────────────────────────────────
# 3. Hygiene: kill orphaned builders, source the prod env
# ────────────────────────────────────────────────────────────────────
# Kill any leftover `next build` from a prior crashed/cancelled run.
# (The flock above prevents NEW races, but a build cancelled mid-run
# before the lock existed can still have orphans we need to clear.)
pkill -f "next/dist/bin/next build" 2>/dev/null || true
pkill -f "prisma generate" 2>/dev/null || true
# Clear stale .next/lock — `next build` writes one and only removes it
# on clean exit; an aborted prior build leaves it pinned and the new
# build refuses to start with "Unable to acquire lock at .next/lock".
rm -f apps/landing/.next/lock 2>/dev/null || true

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

# ────────────────────────────────────────────────────────────────────
# 4. Install, build, reload
# ────────────────────────────────────────────────────────────────────
echo "▶ pnpm install (workspace, frozen lockfile)"
pnpm install --frozen-lockfile || pnpm install

echo "▶ pnpm build @kalit/landing"
pnpm --filter @kalit/landing build

echo "▶ pm2 reload kalit-landing"
# Create the entry the first time, reload thereafter. Without
# --max-restarts/--restart-delay PM2's default is "exit 3+ times in
# < 1s = drop the app permanently" — way too aggressive for a Next.js
# process that takes ~1s to bind :3004 on a cold start.
if pm2 describe kalit-landing >/dev/null 2>&1; then
  pm2 reload kalit-landing --update-env
else
  pm2 start /opt/kalit-landing/start-landing.sh \
    --name kalit-landing \
    --max-restarts 50 \
    --restart-delay 3000
fi

pm2 ls
echo "✓ landing reloaded — port 3004"
