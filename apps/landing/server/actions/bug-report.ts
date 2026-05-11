"use server"

import { auth } from "@/lib/auth"
import { SignJWT } from "jose"

const BROKER_URL = () =>
  (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")

async function signBrokerJwt(
  userId: string,
  email: string,
  orgId?: string | null,
  name?: string | null,
  isAdmin?: boolean,
) {
  const secret =
    process.env.BROKER_JWT_SECRET ||
    process.env.SUITE_JWT_SECRET ||
    process.env.AUTH_SECRET
  if (!secret) throw new Error("Missing signing secret")
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
    .sign(new TextEncoder().encode(secret))
}

export interface BugReportSubmitInput {
  description: string
  sessionId?: string
  projectId?: string
  // Context is an arbitrary JSON snapshot — typically last N messages,
  // suite, model, user agent, etc. The broker stores it as-is for
  // admin inspection without prescribing a schema (forward-compat).
  context?: Record<string, unknown>
}

/** Submit a bug report from the studio. Auth-required. Returns the
 * report id on success so the studio can show "Report #abc submitted". */
export async function submitBugReport(input: BugReportSubmitInput) {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return { error: "Not authenticated" }
  }
  const description = input.description.trim()
  if (!description) {
    return { error: "Description is required" }
  }

  const token = await signBrokerJwt(
    session.user.id,
    session.user.email,
    session.user.orgId,
    session.user.name,
    session.user.isAdmin === true,
  )

  try {
    const res = await fetch(`${BROKER_URL()}/api/flow/bug-reports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        sessionId: input.sessionId || "",
        projectId: input.projectId || "",
        context: input.context || {},
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error || `Broker ${res.status}` }
    }
    return (await res.json()) as { id: string; status: string }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}
