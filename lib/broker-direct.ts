/**
 * Browser → broker API communication helper.
 *
 * Uses Next.js rewrites: browser calls /api/broker/* which Vercel rewrites
 * to the Go broker's /api/flow/*. Same-origin, no CORS needed.
 */

/**
 * Broker URL prefix. Empty string because rewrites are same-origin.
 * Server-side falls back to BROKER_URL env var for direct calls.
 */
export function getBrokerUrl(): string {
  if (typeof window !== "undefined") {
    // Browser — same origin via Next.js rewrites
    return ""
  }
  // Server-side (SSR / API routes)
  return (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")
}

/**
 * Cached broker token. Fetched once from the server-side endpoint
 * (because the NextAuth session cookie is httpOnly).
 */
let cachedToken: string | null = null
let tokenFetchPromise: Promise<string | null> | null = null

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

export async function getBrokerToken(): Promise<string | null> {
  if (cachedToken) return cachedToken
  if (!tokenFetchPromise) {
    tokenFetchPromise = fetchBrokerToken().then((token) => {
      cachedToken = token
      tokenFetchPromise = null
      return token
    })
  }
  return tokenFetchPromise
}

/** Clear cached token (call on logout). */
export function clearBrokerToken(): void {
  cachedToken = null
  tokenFetchPromise = null
}

/**
 * The broker returns canonical URLs with the `/api/flow/` prefix. The Next.js
 * rewrite only exposes `/api/broker/*` to the browser, so any broker-served
 * URL we render (<img src>, download links, …) must be rewritten to the
 * client-visible prefix.
 */
export function toClientFileUrl(url: string | undefined | null): string {
  if (!url) return ""
  if (url.startsWith("/api/flow/")) return `/api/broker/${url.slice("/api/flow/".length)}`
  return url
}

/**
 * Fetch wrapper that adds broker auth header.
 * Paths are relative to the rewrite prefix: /api/broker/sessions → broker's /api/flow/sessions
 */
export async function brokerFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = await getBrokerToken()
  const headers = new Headers(options?.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  // Path should already start with /api/broker/ for rewrites
  const url = `${getBrokerUrl()}${path}`
  return fetch(url, {
    ...options,
    headers,
  })
}
