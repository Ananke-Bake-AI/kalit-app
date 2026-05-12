/**
 * Environment-agnostic broker client.
 *
 * Web (kalit-landing) instantiates this with baseUrl="" + a getToken that
 * hits `/api/broker/token` (httpOnly NextAuth session). Desktop (future Tauri
 * app) instantiates it with baseUrl pointing at the hosted broker and a
 * getToken backed by an OS-keychain credential.
 */

export interface BrokerClientConfig {
  /**
   * Base URL prefix for broker calls. Empty string means "same-origin" — the
   * host app is expected to provide a rewrite from /api/broker/* to the
   * real broker. For desktop set something like "https://api.kalit.ai".
   */
  baseUrl?: string
  /**
   * Async resolver for the current bearer token. Returning null means the
   * caller is unauthenticated; the fetch will still be attempted (some
   * broker routes are public, e.g. find-assets).
   */
  getToken: () => Promise<string | null>
  /**
   * Optional path prefix rewrite for file URLs the broker returns. The broker
   * canonically serves files under `/api/flow/...`. Web rewrites that to
   * `/api/broker/...`; desktop points it at the real broker host.
   */
  fileUrlPrefix?: {
    from: string
    to: string
  }
  /**
   * Prefix applied to find-assets preview URLs. Third-party asset hosts are
   * proxied through a landing route (`/api/broker/find-assets/<rest>`) that
   * adds the API key. Defaults to the relative landing path; desktop should
   * pass an absolute landing URL so packaged renderers (file://) resolve it.
   */
  findAssetsPrefix?: string
  /**
   * Absolute broker origin used by `connectWebSocket`. WebSocket upgrades
   * cannot transit Next.js's `rewrites` (they only proxy HTTP), so the
   * studio dials the broker directly here. Empty string falls back to
   * `baseUrl` and finally `window.location.origin`.
   */
  wsBaseUrl?: string
}

export interface BrokerClient {
  /** Fetch wrapper that adds the bearer token + base URL prefix. */
  fetch: (path: string, options?: RequestInit) => Promise<Response>
  /** Rewrite a broker-canonical file URL for client rendering. */
  mapFileUrl: (url: string | undefined | null) => string
  /** Proxy a find-assets preview URL through the landing asset proxy. */
  mapFindAssetsUrl: (url: string | undefined | null) => string
  /** Invalidate any cached token. Call on logout. */
  clearToken: () => void
  /**
   * Open a per-user multiplexed WebSocket against /api/flow/user-ws.
   * The token is appended as ?token=<jwt> at connect time because
   * browser WebSocket clients can't set custom Authorization headers.
   *
   * Returns the raw WebSocket. Caller owns the connection lifetime
   * (close on unmount). useStudioSocket layers reconnect + protocol
   * on top.
   */
  connectWebSocket: () => Promise<WebSocket>
}

export function createBrokerClient(config: BrokerClientConfig): BrokerClient {
  const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "")
  let cachedToken: string | null = null
  let tokenFetchPromise: Promise<string | null> | null = null

  async function resolveToken(): Promise<string | null> {
    if (cachedToken) return cachedToken
    if (!tokenFetchPromise) {
      tokenFetchPromise = config
        .getToken()
        .then((token) => {
          cachedToken = token
          tokenFetchPromise = null
          return token
        })
        .catch(() => {
          tokenFetchPromise = null
          return null
        })
    }
    return tokenFetchPromise
  }

  async function brokerFetch(path: string, options?: RequestInit): Promise<Response> {
    const token = await resolveToken()
    const headers = new Headers(options?.headers)
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return fetch(`${baseUrl}${path}`, { ...options, headers })
  }

  function mapFileUrl(url: string | undefined | null): string {
    if (!url) return ""
    const prefix = config.fileUrlPrefix
    if (prefix && url.startsWith(prefix.from)) {
      return `${prefix.to}${url.slice(prefix.from.length)}`
    }
    return url
  }

  const findAssetsPrefix = (config.findAssetsPrefix ?? "/api/broker/find-assets/").replace(
    /\/+$/,
    "/",
  )

  function mapFindAssetsUrl(url: string | undefined | null): string {
    if (!url) return ""
    const match = url.match(/https?:\/\/[^/]+\/(.+)/)
    if (match) return `${findAssetsPrefix}${match[1]}`
    return url
  }

  function clearToken(): void {
    cachedToken = null
    tokenFetchPromise = null
  }

  async function connectWebSocket(): Promise<WebSocket> {
    const token = await resolveToken()
    if (!token) {
      throw new Error("broker-client: connectWebSocket requires an auth token")
    }
    // Pick the origin: wsBaseUrl wins (explicit), then baseUrl
    // (HTTP same-origin host), then window.location (browser default
    // when host runs as a SPA bundled at the broker's origin). On
    // web behind Next.js rewrites, the host MUST set wsBaseUrl to
    // the broker public URL because Next's rewrites can't proxy WS.
    const explicit = (config.wsBaseUrl ?? "").replace(/\/+$/, "")
    let origin: string
    if (explicit) {
      origin = explicit
    } else if (baseUrl) {
      origin = baseUrl
    } else if (typeof window !== "undefined") {
      origin = `${window.location.protocol}//${window.location.host}`
    } else {
      throw new Error("broker-client: connectWebSocket needs wsBaseUrl/baseUrl outside a browser")
    }
    const wsUrl = origin.replace(/^http/, "ws") + "/api/flow/user-ws"
    const sep = wsUrl.includes("?") ? "&" : "?"
    return new WebSocket(`${wsUrl}${sep}token=${encodeURIComponent(token)}`)
  }

  return { fetch: brokerFetch, mapFileUrl, mapFindAssetsUrl, clearToken, connectWebSocket }
}
