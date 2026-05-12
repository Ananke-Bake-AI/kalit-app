#!/usr/bin/env bash
# start-landing.sh — PM2 entry point for the kalit-landing process.
#
# Invoked by PM2 (see /root/kalit-broker-style entry, or `pm2 start
# start-landing.sh --name kalit-landing` in restart.sh). Boots Next.js
# in production mode against the prebuilt .next/ in apps/landing.
#
# Kept under version control on purpose: it used to live as an
# untracked file in /opt/kalit-landing/, which meant any `git stash -u`
# during deploy could quietly swallow it. PM2 then ran into
# "No such file or directory" and dropped the app — which is the
# failure mode that took the homepage down on 2026-05-12.
#
# Resolve our own directory so the script works whether PM2 invokes us
# via absolute path, relative path, or symlink.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$ROOT/apps/landing"
exec node node_modules/next/dist/bin/next start -p 3004
