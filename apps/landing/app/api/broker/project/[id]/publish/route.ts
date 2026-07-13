import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

// Attend qu'un site fraîchement publié réponde vraiment (2xx) avant de rendre la
// main — le déploiement subdomain (copie fichiers + vhost nginx) prend quelques
// secondes, et sans ça l'utilisateur cliquait « Voir le site » sur une page pas
// encore disponible. Poll server-side (lit le vrai status, contrairement à un
// fetch no-cors navigateur qui est opaque). Borné : on rend la main au timeout.
async function waitUntilLive(url: string, timeoutMs = 25000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "GET", cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(5000) })
      if (r.ok) return // 2xx → le site est réellement servi
    } catch {
      /* pas encore prêt (DNS/nginx/502) → on retente */
    }
    await new Promise((res) => setTimeout(res, 1500))
  }
}

/** GET: fetch publish/delivery info */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`project/${id}/publish`, result.token)
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean
    data?: unknown
    error?: string
  }
  // Broker wraps its payload as { success, data: {...fields} }. Unwrap once so
  // clients see a single-level { success, data: {...fields} }.
  const payload = body && typeof body === "object" && "data" in body ? body.data : body
  return NextResponse.json(
    res.ok ? { success: true, data: payload } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}

/** POST: generic publish action (subdomain deploy, vercel, domain) — body is forwarded */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const reqBody = await request.text()
  const res = await brokerProxy(`project/${id}/publish`, result.token, {
    method: "POST",
    body: reqBody,
    headers: { "Content-Type": "application/json" },
  })
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean
    data?: unknown
    error?: string
  }
  const payload = body && typeof body === "object" && "data" in body ? body.data : body

  // Déploiement subdomain réussi → on attend que le site réponde vraiment (2xx)
  // avant de rendre « publié », pour que « Voir le site » ouvre une page dispo
  // (pas une 502 le temps du deploy). Autres actions (domain) : pas d'attente.
  if (res.ok) {
    let action = ""
    try { action = (JSON.parse(reqBody || "{}") as { action?: string }).action || "" } catch { /* ignore */ }
    const url = (payload as { subdomainUrl?: string } | null)?.subdomainUrl
    if (action === "subdomain" && url) await waitUntilLive(url)
  }

  return NextResponse.json(
    res.ok ? { success: true, data: payload } : { success: false, error: body?.error || "Failed" },
    { status: res.status },
  )
}
