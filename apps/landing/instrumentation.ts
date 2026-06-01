/**
 * Boot-time environment guard.
 *
 * The deploy pipeline has twice shipped a blanked `apps/landing/.env`, which
 * silently broke prod: BROKER_JWT_SECRET empty → the broker token gets signed
 * with the wrong (fallback) secret → the broker 401s the studio ("Le service a
 * répondu avec 401"); GOOGLE_CLIENT_* empty → Google login dies. Both were
 * invisible until users complained.
 *
 * This turns that into a loud, immediate failure: in production, if a core
 * secret is missing the server REFUSES TO START (pm2 shows it errored) instead
 * of serving a half-dead app. The live `.env` is also `chattr +i` on the box;
 * this is the code-versioned backstop in case that lock is ever removed.
 */
export async function register() {
  // Secrets only live in the Node.js server runtime; skip the edge runtime.
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return

  const isSet = (k: string) => !!process.env[k]?.trim()

  // Core — without these the app is fundamentally broken (studio↔broker auth,
  // session auth, database).
  const required = ["BROKER_JWT_SECRET", "AUTH_SECRET", "DATABASE_URL"]
  // Important but non-fatal — a missing one degrades a single feature (an OAuth
  // provider, plan lookups, asset search) without taking the whole app down.
  const recommended = [
    "NEXTAUTH_SECRET",
    "BROKER_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "SUITE_API_KEY",
    "SUITE_JWT_SECRET",
    "FIND_ASSETS_API_KEY",
  ]

  const missingRequired = required.filter((k) => !isSet(k))
  const missingRecommended = recommended.filter((k) => !isSet(k))

  if (missingRecommended.length) {
    console.error(
      `[env-guard] ⚠️  Missing recommended env (features degraded): ${missingRecommended.join(", ")}`,
    )
  }

  if (missingRequired.length) {
    console.error(
      "\n════════════════════════════════════════════════════════════\n" +
        ` [env-guard] FATAL — missing required env: ${missingRequired.join(", ")}\n` +
        " A deploy likely blanked apps/landing/.env. Restore it from\n" +
        " /root/env-landing-KNOWN-GOOD.env (chattr -i first), then restart.\n" +
        " Refusing to start so this can't silently 401 the studio.\n" +
        "════════════════════════════════════════════════════════════\n",
    )
    if (process.env.NODE_ENV === "production") {
      // Hard stop — fail closed and loud rather than serve broken auth.
      process.exit(1)
    }
  }
}
