/**
 * Server-side broker fetch helper.
 * Used by API routes to proxy requests to the Go broker.
 */

import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { auth } from "@/lib/auth"

const BROKER_URL = () =>
  (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")

/**
 * Sign a short-lived JWT for the current user (for server-side broker calls).
 */
async function signBrokerJwt(userId: string, email: string, orgId?: string | null, name?: string | null, isAdmin?: boolean) {
  const secret =
    process.env.BROKER_JWT_SECRET ||
    process.env.SUITE_JWT_SECRET ||
    process.env.AUTH_SECRET
  if (!secret) throw new Error("Missing signing secret")

  const encoder = new TextEncoder()
  return new SignJWT({
    email,
    name: name || null,
    orgId: orgId || null,
    isAdmin: isAdmin === true,
    externalUserId: userId,
    externalOrgId: orgId || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setSubject(userId)
    .setIssuer("kalit-main")
    .sign(encoder.encode(secret))
}

/**
 * Authenticate the current user and return a broker-ready token + session.
 * Returns null (and a 401 response) if not authenticated.
 */
export async function authAndToken() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const token = await signBrokerJwt(
    session.user.id,
    session.user.email,
    session.user.orgId,
    session.user.name,
    session.user.isAdmin === true,
  )
  return { token, session }
}

/**
 * Proxy a request to the broker.
 * `brokerPath` should NOT start with a leading slash — it's relative to /api/flow/.
 */
export async function brokerProxy(
  brokerPath: string,
  token: string,
  options?: {
    method?: string
    body?: BodyInit | null
    headers?: Record<string, string>
  },
): Promise<Response> {
  const url = `${BROKER_URL()}/api/flow/${brokerPath}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...options?.headers,
  }
  return fetch(url, {
    method: options?.method || "GET",
    headers,
    body: options?.body,
  })
}
