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

async function brokerCall<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T | { error: string }> {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return { error: "Not authenticated" }
  }
  const token = await signBrokerJwt(
    session.user.id,
    session.user.email,
    session.user.orgId,
    session.user.name,
    session.user.isAdmin === true,
  )
  try {
    const res = await fetch(`${BROKER_URL()}${path}`, {
      method: options?.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error || `Broker returned ${res.status}` }
    }
    if (res.status === 204) return {} as T
    return (await res.json()) as T
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" }
  }
}

// ─── Public types (mirror broker repoProjectJSON) ─────────────────

export interface RepositoryProject {
  id: string
  title?: string | null
  displayName?: string | null
  prompt: string
  status: string
  projectType: string
  subdomain?: string | null
  subdomainUrl?: string | null
  subdomainDeployedAt?: string | null
  vercelUrl?: string | null
  vercelDeployedAt?: string | null
  archivedAt?: string | null
  lastOpenedAt?: string | null
  createdAt: string
  updatedAt: string
  hasThumbnail: boolean
  visibility: "private" | "public"
  publishedAt?: string | null
  starCount: number
  viewerStarred: boolean
}

interface ListResponse {
  projects: RepositoryProject[]
  count: number
  cap: number
}

// ─── Server actions ───────────────────────────────────────────────

export async function listRepositories(includeArchived = false) {
  return brokerCall<ListResponse>(
    `/api/flow/projects${includeArchived ? "?archived=1" : ""}`,
  )
}

export async function renameRepository(id: string, displayName: string) {
  return brokerCall<{ success: boolean }>(`/api/flow/projects/${id}`, {
    method: "PATCH",
    body: { displayName },
  })
}

export async function archiveRepository(id: string, archived: boolean) {
  return brokerCall<{ success: boolean }>(`/api/flow/projects/${id}`, {
    method: "PATCH",
    body: { archived },
  })
}

export async function deleteRepository(id: string) {
  return brokerCall<{
    vercelDeleted?: boolean
    vercelError?: string
    subdomainCleared?: boolean
    taskforceDeleted?: boolean
    rowDropped?: boolean
  }>(`/api/flow/projects/${id}`, { method: "DELETE" })
}

export async function openRepository(id: string) {
  return brokerCall<{ sessionId: string; projectId: string }>(
    `/api/flow/projects/${id}/open`,
    { method: "POST" },
  )
}

// Forks the project on Taskforce, mints a fresh chat session, and
// returns the canned remix prompt the studio will auto-send. `idea`
// is optional — when omitted the broker generates a "fully automatic"
// remix brief.
export async function remixRepository(id: string, idea?: string) {
  return brokerCall<{
    sessionId: string
    projectId: string
    externalProjectId: string
    prompt: string
    sourceProjectId: string
  }>(`/api/flow/projects/${id}/remix`, {
    method: "POST",
    body: { idea: idea ?? "" },
  })
}

// Toggle visibility (private ↔ public). Visibility=public exposes the
// project on /discover and on the owner's /u/{username} page.
export async function setRepositoryVisibility(id: string, visibility: "private" | "public") {
  return brokerCall<{ success: boolean }>(`/api/flow/projects/${id}`, {
    method: "PATCH",
    body: { visibility },
  })
}

// Toggle the viewer's star on a project. Owner-stars are allowed
// (mirrors GitHub semantics). Broker returns the post-toggle state.
export async function toggleRepositoryStar(id: string) {
  return brokerCall<{ starred: boolean; starCount: number }>(
    `/api/flow/projects/${id}/star`,
    { method: "POST" },
  )
}
