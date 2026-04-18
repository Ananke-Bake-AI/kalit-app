/**
 * Shared logic for creating a broker session and navigating to /studio.
 * Used by suite hero prompts and the home page hero.
 */

import { brokerFetch } from "@/lib/broker-direct"
import type { SuiteId } from "@/lib/suites"

/**
 * Create a broker session and return the /studio URL with params.
 * Falls back to a prompt-only URL if session creation fails.
 */
export async function createStudioSession(
  prompt: string,
  suiteId: SuiteId,
): Promise<string> {
  try {
    const res = await brokerFetch("/api/broker/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "anthropic:claude-haiku-4-5-20251001" }),
    })
    if (res.ok) {
      const data = await res.json()
      const sessionId = data.session?.id
      if (sessionId) {
        return `/studio?session=${sessionId}&prompt=${encodeURIComponent(prompt)}&suite=${suiteId}`
      }
    }
  } catch {
    // Fall through
  }
  // Fallback: navigate to studio with just prompt + suite (studio-client will create session)
  return `/studio?prompt=${encodeURIComponent(prompt)}&suite=${suiteId}`
}

/**
 * Build a login URL that redirects back to /studio after auth.
 */
export function studioLoginHref(prompt: string, suiteId: SuiteId): string {
  const studioPath = `/studio?prompt=${encodeURIComponent(prompt)}&suite=${suiteId}`
  return `/login?callbackUrl=${encodeURIComponent(studioPath)}`
}
