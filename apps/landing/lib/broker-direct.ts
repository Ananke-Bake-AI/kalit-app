/**
 * Browser → broker API wiring for kalit-landing.
 *
 * Thin adapter around `@kalit/broker-client`. The package is environment-agnostic
 * (shared with the future desktop app); this file injects the web-specific
 * token source and URL rewrites.
 *
 * Server-side callers (API routes) should use `lib/broker-server.ts` instead —
 * it has access to the NextAuth session and mints the JWT directly.
 */

import { createBrokerClient } from "@kalit/broker-client"
import { setStudioBrokerClient } from "@kalit/studio-ui"

async function fetchBrokerToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/broker/token")
    if (!res.ok) return null
    const data = await res.json()
    return data.token || null
  } catch {
    return null
  }
}

// WebSocket can't transit Next.js's HTTP rewrites — connectWebSocket
// dials the broker origin directly. NEXT_PUBLIC_BROKER_URL is read at
// build time (set in apps/landing/.env, .env.production, or Vercel env);
// when missing we fall back to the prod broker host so the studio still
// works after a deploy that forgot the env var. (Visible failure on
// 2026-05-14 Vercel deploy: NEXT_PUBLIC_BROKER_URL wasn't propagated,
// the bundle baked in `wsBaseUrl=""`, and the client built
// `wss://kalit.ai/api/flow/user-ws` — Vercel only rewrites /api/broker/*
// and WS upgrades can't transit the rewrite anyway. No user
// successfully registered on user_ws for hours.)
const wsBaseUrl = process.env.NEXT_PUBLIC_BROKER_URL || "https://broker-api.kalit.ai"

const client = createBrokerClient({
  baseUrl: "",
  wsBaseUrl,
  getToken: fetchBrokerToken,
  fileUrlPrefix: { from: "/api/flow/", to: "/api/broker/" },
})

setStudioBrokerClient(client)

/** Invalidate the cached broker token (call on logout). */
export function clearBrokerToken(): void {
  client.clearToken()
}

/** Rewrite `/api/flow/*` file URLs returned by the broker for browser rendering. */
export function toClientFileUrl(url: string | undefined | null): string {
  return client.mapFileUrl(url)
}

/**
 * Fetch wrapper that adds broker auth header.
 * Paths are relative to the rewrite prefix: /api/broker/sessions → broker's /api/flow/sessions
 */
export async function brokerFetch(path: string, options?: RequestInit): Promise<Response> {
  return client.fetch(path, options)
}
