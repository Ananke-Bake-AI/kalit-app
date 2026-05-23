# ops/nginx

Nginx vhost configs for the kalit.ai prod box (`root@34.107.97.52`). These
mirror what's in `/etc/nginx/sites-available/` on the server so the configs
aren't lost on a reboot, DNS migration, or stripped-disk recovery.

The deploy script (`deploy.sh`) doesn't push these automatically — the box's
nginx config rarely changes and a misapplied vhost can take the site down.
Apply manually when needed.

## Files

| File             | Purpose                                                                 |
|------------------|-------------------------------------------------------------------------|
| `kalit.ai.conf`  | Apex landing vhost. Reverse-proxies `kalit.ai` + `www.kalit.ai` → `:3004` (the Next.js app started by `start-landing.sh`). Forwards `CF-IPCountry` for the currency module. |

## Applying a config

```sh
scp ops/nginx/kalit.ai.conf root@34.107.97.52:/etc/nginx/sites-available/kalit.ai
ssh root@34.107.97.52 '
  ln -sf /etc/nginx/sites-available/kalit.ai /etc/nginx/sites-enabled/kalit.ai
  nginx -t && nginx -s reload
'
```

`nginx -t` first — if syntax is off the reload won't happen and the live
config keeps serving. If you're rotating SSL certs or changing TLS settings,
also check `journalctl -u nginx --since "5m ago"` after the reload.

## Incident history

- **2026-05-23** — `kalit.ai` DNS flipped from Vercel back to the GCP origin.
  No matching vhost existed in `sites-enabled/`, so nginx fell through to
  the first-loaded server block (`db-marketing.kalit.ai` / Adminer). Effect:
  `kalit.ai/` served the Adminer login page (200) and every `/<locale>/*`
  path 404'd. Fix: recreate this file, symlink, reload.
