"use client"

import { useEffect } from "react"
import { pushDataLayer } from "@/lib/analytics/data-layer"

/**
 * Fires `signup_completed` exactly once for OAuth signups, AFTER the redirect
 * back — i.e. once the account provably exists.
 *
 * Why not fire on the register page's OAuth button click? That's what the old
 * code did ("optimistically", pre-redirect), and it counted every click:
 * existing users signing in through the register page, abandoned OAuth
 * consents, double clicks… Meta ended up reporting ~1k CompleteRegistration
 * against ~600 real accounts, and ads optimized on a fake signal.
 *
 * How it works: lib/auth.ts stamps `signupAt`/`signupMethod` into the JWT only
 * when Auth.js reports trigger === "signUp" (adapter just created the user).
 * On the first page after redirect this component reads the session and fires
 * the conversion. Guards against re-fires:
 *   - localStorage flag (survives reloads / SPA navs on this browser)
 *   - 30-min window on `signupAt` (covers new devices, where the JWT still
 *     carries the stamp but the conversion is long past)
 *   - `conversion_id` = user id → X-side dedup even if both still fire
 *
 * Credentials signups keep firing inline on the register page (the account is
 * created by our own server action, so that signal is already exact); they
 * never get a `signupAt` stamp, so this tracker stays silent for them.
 */
const GUARD_KEY = "kalit_signup_tracked"
const FRESH_WINDOW_MS = 30 * 60 * 1000

export function SignupConversionTracker() {
  useEffect(() => {
    try {
      if (localStorage.getItem(GUARD_KEY)) return
    } catch {
      return
    }

    // No Auth.js session cookie → nobody to attribute; don't hit the API.
    // (Matches both `authjs.session-token` and `__Secure-authjs.session-token`.)
    if (!document.cookie.includes("authjs.session-token")) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session")
        if (!res.ok || cancelled) return
        const session = await res.json()
        const user = session?.user
        if (!user?.id) return

        if (typeof user.signupAt === "number" && Date.now() - user.signupAt < FRESH_WINDOW_MS) {
          pushDataLayer("signup_completed", {
            method: user.signupMethod || "oauth",
            // X dedup key — repeat fires for the same user collapse to one.
            conversion_id: user.id
          })
        }
        // Logged-in with no fresh stamp = nothing to ever track — set the
        // guard either way so we don't refetch the session on every page.
        localStorage.setItem(GUARD_KEY, "1")
      } catch {
        /* network blip — retry naturally on next page load */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
