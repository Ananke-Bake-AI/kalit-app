/**
 * GitHub App server-side helpers.
 *
 * Authentication model:
 * - App JWT  — short-lived (max 10min), signed with our RSA private key,
 *              used for "/app/..." endpoints and to mint installation tokens.
 * - Installation token — 1h TTL, minted via the App JWT, used for everything
 *              that touches repo contents. We never persist these; we mint
 *              on demand and hand them to the broker for the duration of a
 *              clone/push operation.
 */

import { SignJWT } from "jose"
import { createPrivateKey, type KeyObject } from "node:crypto"

export interface GitHubAppConfig {
  appId: string
  slug: string
  clientId: string
  privateKey: string
}

export interface InstallationToken {
  token: string
  expiresAt: string
}

export interface GitHubAccount {
  id: number
  login: string
  type: string
}

export interface GitHubInstallationInfo {
  id: number
  account: GitHubAccount
  suspended_at: string | null
  repository_selection: "all" | "selected"
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  private: boolean
  default_branch: string
  html_url: string
  clone_url: string
  description: string | null
}

export function getGitHubAppConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID
  const slug = process.env.GITHUB_APP_SLUG
  const clientId = process.env.GITHUB_APP_CLIENT_ID
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
  if (!appId || !slug || !clientId || !privateKey) return null
  return { appId, slug, clientId, privateKey: normalizePem(privateKey) }
}

// Env-friendly: accept PEM with real newlines, escaped \n, or base64-encoded.
function normalizePem(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.includes("BEGIN") && trimmed.includes("PRIVATE KEY")) {
    return trimmed.replace(/\\n/g, "\n")
  }
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8")
    if (decoded.includes("BEGIN") && decoded.includes("PRIVATE KEY")) {
      return decoded
    }
  } catch {}
  throw new Error("GITHUB_APP_PRIVATE_KEY is not a valid PEM-encoded RSA key")
}

// node:crypto.createPrivateKey auto-detects PKCS#1 (`BEGIN RSA PRIVATE KEY` —
// what GitHub Apps hand out) AND PKCS#8 (`BEGIN PRIVATE KEY`). jose's
// `importPKCS8` only handles PKCS#8, so we use node directly.
let cachedKey: KeyObject | null = null
function loadPrivateKey(pem: string): KeyObject {
  if (cachedKey) return cachedKey
  cachedKey = createPrivateKey({ key: pem, format: "pem" })
  return cachedKey
}

// Signs a JWT for the app itself — required to call /app/* endpoints and to
// mint installation tokens.
export async function generateAppJWT(cfg: GitHubAppConfig): Promise<string> {
  const key = loadPrivateKey(cfg.privateKey)
  // GitHub docs: iat can be up to 60s in the past to tolerate clock skew.
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(now - 30)
    .setExpirationTime(now + 540)
    .setIssuer(cfg.appId)
    .sign(key)
}

async function ghFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kalit-ai",
      ...(init?.headers || {}),
    },
  })
  return res
}

export async function getInstallation(
  cfg: GitHubAppConfig,
  installationId: string | number,
): Promise<GitHubInstallationInfo> {
  const jwt = await generateAppJWT(cfg)
  const res = await ghFetch(`/app/installations/${installationId}`, jwt)
  if (!res.ok) {
    throw new Error(`GitHub getInstallation failed: ${res.status}`)
  }
  return (await res.json()) as GitHubInstallationInfo
}

export async function mintInstallationToken(
  cfg: GitHubAppConfig,
  installationId: string | number,
): Promise<InstallationToken> {
  const jwt = await generateAppJWT(cfg)
  const res = await ghFetch(
    `/app/installations/${installationId}/access_tokens`,
    jwt,
    { method: "POST" },
  )
  if (!res.ok) {
    throw new Error(`GitHub mintInstallationToken failed: ${res.status}`)
  }
  const data = (await res.json()) as { token: string; expires_at: string }
  return { token: data.token, expiresAt: data.expires_at }
}

export async function listInstallationRepos(
  installationToken: string,
): Promise<GitHubRepo[]> {
  const out: GitHubRepo[] = []
  let page = 1
  while (true) {
    const res = await ghFetch(
      `/installation/repositories?per_page=100&page=${page}`,
      installationToken,
    )
    if (!res.ok) {
      throw new Error(`GitHub listInstallationRepos failed: ${res.status}`)
    }
    const data = (await res.json()) as { repositories: GitHubRepo[] }
    out.push(...data.repositories)
    if (data.repositories.length < 100) break
    page += 1
    if (page > 10) break
  }
  return out
}

export function installUrl(cfg: GitHubAppConfig, state: string): string {
  const base = `https://github.com/apps/${encodeURIComponent(cfg.slug)}/installations/new`
  const qs = new URLSearchParams({ state })
  return `${base}?${qs.toString()}`
}
