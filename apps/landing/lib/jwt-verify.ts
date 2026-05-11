/**
 * Verify a mobile/desktop Bearer JWT (issued by /[locale]/auth/desktop).
 *
 * The native apps (Capacitor mobile, Electron desktop) run on non-http origins
 * and have no NextAuth session cookie for kalit.ai. They authenticate via a
 * 30-day JWT delivered through a deep-link redirect at sign-in. Routes that
 * need to serve both web (session) and native (Bearer) callers should call
 * `authUserFromRequest(req)`, which tries NextAuth first and falls back to
 * verifying the Bearer token against BROKER_JWT_SECRET / SUITE_JWT_SECRET /
 * AUTH_SECRET — the same secret set the desktop-auth page signs with.
 */

import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"

export interface AuthedUser {
  id: string
  email: string
  orgId: string | null
  isAdmin: boolean
}

function getSecret(): Uint8Array {
  const secret =
    process.env.BROKER_JWT_SECRET ||
    process.env.SUITE_JWT_SECRET ||
    process.env.AUTH_SECRET
  if (!secret) throw new Error("Missing signing secret")
  return new TextEncoder().encode(secret)
}

async function verifyBearer(token: string): Promise<AuthedUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: "kalit-main" })
    const id = (payload.sub || payload.externalUserId) as string | undefined
    const email = payload.email as string | undefined
    if (!id || !email) return null
    return {
      id,
      email,
      orgId: (payload.orgId as string | null) ?? null,
      isAdmin: payload.isAdmin === true,
    }
  } catch {
    return null
  }
}

export async function authUserFromRequest(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization")
  if (header?.startsWith("Bearer ")) {
    const user = await verifyBearer(header.slice("Bearer ".length))
    if (user) return user
  }
  const session = await auth()
  if (session?.user?.id && session.user.email) {
    return {
      id: session.user.id,
      email: session.user.email,
      orgId: session.user.orgId ?? null,
      isAdmin: session.user.isAdmin === true,
    }
  }
  return null
}
