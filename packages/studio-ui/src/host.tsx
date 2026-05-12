/**
 * Host-provided Studio integration points.
 *
 * The Studio UI package is environment-agnostic; it delegates a small set of
 * concerns back to the host (web or desktop) via:
 *   1. a module-level broker client singleton, so the thousands of brokerFetch
 *      callsites inside Studio don't need to know where the client came from
 *   2. a React context for the current user (admin gating + avatar data)
 *   3. a React context for navigation (navigate to other Studio surfaces)
 *
 * Host responsibilities at bootstrap:
 *   - import { setStudioBrokerClient } and call it with a BrokerClient
 *   - wrap Studio with <StudioHostProvider user={...} navigate={...}>
 */

"use client"

import type { BrokerClient } from "@kalit/broker-client"
import { createContext, useContext, type ReactNode } from "react"

// ---------------------------------------------------------------------------
// Broker singleton — set once by the host at bootstrap.
// ---------------------------------------------------------------------------

let client: BrokerClient | null = null

export function setStudioBrokerClient(c: BrokerClient): void {
  client = c
}

function requireClient(): BrokerClient {
  if (!client) {
    throw new Error(
      "@kalit/studio-ui: broker client not initialized. Call setStudioBrokerClient() at host startup.",
    )
  }
  return client
}

/** Internal-use accessor for hooks that need the BrokerClient
 *  itself (e.g. useStudioSocket wants connectWebSocket). Throws if
 *  the host hasn't run setStudioBrokerClient yet. */
export function getStudioBrokerClient(): BrokerClient {
  return requireClient()
}

/** Drop-in replacement for the legacy `brokerFetch` export. */
export async function brokerFetch(path: string, options?: RequestInit): Promise<Response> {
  return requireClient().fetch(path, options)
}

// ---------------------------------------------------------------------------
// Landing fetch — for Next.js API routes on the kalit.ai landing (e.g. GitHub
// App endpoints). Web runs at the landing origin so relative URLs work; native
// hosts (Capacitor mobile at capacitor://localhost, Electron at file://) must
// both prefix absolute origin AND attach a Bearer JWT since there's no
// session cookie across origins.
// ---------------------------------------------------------------------------

export interface LandingFetchConfig {
  /** Absolute landing origin, e.g. "https://kalit.ai". Omit on web. */
  origin?: string
  /** Returns the current auth token (Bearer). Omit on web (session cookie used). */
  getToken?: () => Promise<string | null> | string | null
}

let landingConfig: LandingFetchConfig = {}

export function setLandingFetchConfig(cfg: LandingFetchConfig): void {
  landingConfig = cfg
}

export async function landingFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = landingConfig.origin ? `${landingConfig.origin.replace(/\/+$/, "")}${path}` : path
  const headers = new Headers(options?.headers)
  if (landingConfig.getToken) {
    const token = await landingConfig.getToken()
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`)
    }
  }
  return fetch(url, { ...options, headers })
}

/** Drop-in replacement for the legacy `toClientFileUrl` helper. */
export function toClientFileUrl(url: string | undefined | null): string {
  return client ? client.mapFileUrl(url) : (url ?? "")
}

/** Rewrite a find-assets preview URL through the landing's asset proxy. */
export function toFindAssetsUrl(url: string | undefined | null): string {
  if (client?.mapFindAssetsUrl) return client.mapFindAssetsUrl(url)
  if (!url) return ""
  const match = url.match(/https?:\/\/[^/]+\/(.+)/)
  if (match) return `/api/broker/find-assets/${match[1]}`
  return url
}

/** Clear cached auth (call on logout). Safe to call even if no client set. */
export function clearBrokerToken(): void {
  client?.clearToken()
}

// ---------------------------------------------------------------------------
// User + navigation contexts.
// ---------------------------------------------------------------------------

export interface StudioUser {
  id?: string | null
  email?: string | null
  name?: string | null
  image?: string | null
  isAdmin?: boolean
}

export interface StudioHostValue {
  /** Current authenticated user, or null when anonymous. */
  user: StudioUser | null
  /** Navigate to a Studio-owned path (e.g. "/studio/project/abc123"). */
  navigate?: (path: string) => void
  /** Read a URL search param — web uses useSearchParams, desktop uses its own router. */
  getSearchParam?: (key: string) => string | null
}

const StudioHostContext = createContext<StudioHostValue>({ user: null })

export function StudioHostProvider({
  value,
  children,
}: {
  value: StudioHostValue
  children: ReactNode
}) {
  return <StudioHostContext.Provider value={value}>{children}</StudioHostContext.Provider>
}

export function useStudioHost(): StudioHostValue {
  return useContext(StudioHostContext)
}

/** Shortcut: just the current user (or null). */
export function useStudioUser(): StudioUser | null {
  return useContext(StudioHostContext).user
}
