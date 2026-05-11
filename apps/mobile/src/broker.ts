import { createBrokerClient } from "@kalit/broker-client"
import { setStudioBrokerClient, setLandingFetchConfig } from "@kalit/studio-ui"

const TOKEN_STORAGE_KEY = "kalit-broker-token"
const BROKER_BASE_URL =
  import.meta.env.VITE_BROKER_URL ||
  (import.meta.env.DEV ? "" : "https://kalit.ai")

async function getToken(): Promise<string | null> {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

// Mobile runs inside a Capacitor WebView with a `capacitor://` / `file://`
// origin, so relative paths like `/api/broker/...` (used by the landing's
// Next.js proxy) 404 against the bundle. Rewrite file + find-assets URLs to
// absolute landing endpoints so previews and uploads resolve correctly.
const LANDING_ORIGIN = BROKER_BASE_URL || "https://kalit.ai"

const client = createBrokerClient({
  baseUrl: BROKER_BASE_URL,
  getToken,
  fileUrlPrefix: {
    from: "/api/flow/",
    to: `${LANDING_ORIGIN}/api/broker/`,
  },
  findAssetsPrefix: `${LANDING_ORIGIN}/api/broker/find-assets/`,
})

setStudioBrokerClient(client)

// Studio-ui landing routes (GitHub import, etc.) run on kalit.ai and need an
// absolute URL from capacitor://. Reuse the same JWT that authenticates broker
// calls — the landing now accepts it on /api/github/* via authUserFromRequest.
setLandingFetchConfig({
  origin: LANDING_ORIGIN,
  getToken,
})

export function setBrokerToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  client.clearToken()
}

export function clearBrokerToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  client.clearToken()
}
