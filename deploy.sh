#!/usr/bin/env bash
# kalit.ai landing deploy → 34.107.97.52 (GCP origin behind Cloudflare).
#
# Usage:
#   ./deploy.sh                  # full deploy (rsync + clean rebuild)
#   ./deploy.sh --fast           # skip rsync — only rebuild & restart pm2 on the server
#                                # (use when you already pushed a hotfix and don't
#                                #  want to re-rsync source; the server pulls via
#                                #  its own state — only safe right after a normal
#                                #  deploy when the code on the box already matches)
#   ./deploy.sh --no-rebuild     # rsync only, no rebuild (rarely useful)
#
# Why this script exists: a naive `pm2 restart` mid-build corrupts .next
# because pm2 keeps respawning kalit-landing and races Next.js's lock file
# → ChunkLoadError on every subsequent request. We must `pm2 delete`
# BEFORE rebuilding, then start pm2 fresh AFTER. This script enforces
# that order, preserves the server's .env and proxy.ts (both contain
# self-hosted-specific tweaks NOT in git), and verifies BUILD_ID exists
# before starting pm2.
#
# Requires `sshpass` (brew install sshpass). The password is hard-coded
# here on purpose — this script is committed to the private repo and the
# server only accepts root via this single deployment box.

set -euo pipefail

SERVER="root@34.107.97.52"
PASS="KonT@KTK@LIT20"
REMOTE_PATH="/opt/kalit-landing"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Files the server owns and we MUST NOT overwrite from local:
#   apps/landing/.env       — prod env (Neon DB, https://kalit.ai URLs,
#                             Stripe live keys, all OAuth IDs). Local
#                             .env is a dev pointer to localhost.
#   apps/landing/proxy.ts   — self-hosted patch (locale-canonical strip
#                             disabled to avoid the rewrite loop that
#                             only manifests outside Vercel).
RSYNC_EXCLUDES=(
  --exclude='apps/landing/.env'
  --exclude='apps/landing/proxy.ts'
  --exclude='node_modules'
  --exclude='.next'
  --exclude='.turbo'
  --exclude='.git'
  --exclude='.DS_Store'
)

FAST_MODE=0
SKIP_REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --fast)        FAST_MODE=1 ;;
    --no-rebuild)  SKIP_REBUILD=1 ;;
    *)             echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

ssh_run() {
  sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "$1"
}

echo "━━━ [1/5] stopping pm2 kalit-landing (delete to break the restart loop) ━━━"
ssh_run "pm2 delete kalit-landing 2>/dev/null || true"

if [[ $FAST_MODE -eq 0 ]]; then
  echo "━━━ [2/5] rsync apps/landing + packages → server ━━━"
  sshpass -p "$PASS" rsync -az "${RSYNC_EXCLUDES[@]}" \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/apps/landing/" "$SERVER:$REMOTE_PATH/apps/landing/"
  sshpass -p "$PASS" rsync -az "${RSYNC_EXCLUDES[@]}" \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/packages/" "$SERVER:$REMOTE_PATH/packages/"
  # Lockfile + workspace config so pnpm install stays in sync if deps drift
  sshpass -p "$PASS" rsync -az \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$LOCAL_PATH/pnpm-lock.yaml" "$LOCAL_PATH/pnpm-workspace.yaml" "$LOCAL_PATH/package.json" \
    "$SERVER:$REMOTE_PATH/"
else
  echo "━━━ [2/5] SKIPPED rsync (--fast) ━━━"
fi

if [[ $SKIP_REBUILD -eq 0 ]]; then
  echo "━━━ [3/5] pnpm install (idempotent — fast no-op when deps unchanged) ━━━"
  ssh_run "cd $REMOTE_PATH && pnpm install --frozen-lockfile 2>&1 | tail -3"

  echo "━━━ [4/5] clean rebuild (rm -rf .next first; pm2 is OFF so no lock race) ━━━"
  ssh_run "rm -rf $REMOTE_PATH/apps/landing/.next && cd $REMOTE_PATH && pnpm --filter @kalit/landing build 2>&1 | tail -8"

  # Hard gate: never start pm2 against an incomplete build.
  echo "━━━     verifying BUILD_ID exists ━━━"
  if ! ssh_run "test -f $REMOTE_PATH/apps/landing/.next/BUILD_ID"; then
    echo "ERROR: .next/BUILD_ID missing — build failed. pm2 left stopped." >&2
    exit 1
  fi
  ssh_run "echo \"     BUILD_ID = \$(cat $REMOTE_PATH/apps/landing/.next/BUILD_ID)\""
else
  echo "━━━ [3-4/5] SKIPPED rebuild (--no-rebuild) ━━━"
fi

echo "━━━ [5/5] start pm2 kalit-landing + smoke test ━━━"
ssh_run "pm2 start $REMOTE_PATH/start-landing.sh --name kalit-landing --interpreter bash 2>&1 | tail -2"
sleep 4

# Smoke test — kalit.ai through Cloudflare. 200 = good; anything else = bad.
status=$(curl -sI -o /dev/null -w "%{http_code}" https://kalit.ai/)
if [[ "$status" == "200" ]]; then
  echo "✅ kalit.ai/ → $status"
else
  echo "⚠️  kalit.ai/ → $status (expected 200). Check 'pm2 logs kalit-landing' on the server."
  exit 1
fi
echo "━━━ done ━━━"
