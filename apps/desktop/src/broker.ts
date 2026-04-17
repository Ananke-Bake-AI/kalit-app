import { createBrokerClient } from "@kalit/broker-client"
import { setStudioBrokerClient } from "@kalit/studio-ui"

const TOKEN_STORAGE_KEY = "kalit-broker-token"

async function getToken(): Promise<string | null> {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

const client = createBrokerClient({
  baseUrl: "",
  getToken,
})

setStudioBrokerClient(client)

export function setBrokerToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  client.clearToken()
}

export function clearBrokerToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  client.clearToken()
}
