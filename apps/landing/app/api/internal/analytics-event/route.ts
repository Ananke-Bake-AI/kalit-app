/**
 * POST /api/internal/analytics-event
 *
 * Server-to-server analytics ingest. The broker calls this at generation
 * lifecycle points (start / success / failure) — events that happen with no
 * browser attached (a closed tab mid-turn, or a headless/API run), so the
 * frontend can't reliably fire them. The broker knows only session/project ids;
 * this endpoint resolves the user's email + attribution here (where the DB and
 * the GA4/Meta secrets live) and fans the event out.
 *
 * Auth: shared Bearer BROKER_INTERNAL_TOKEN — the same secret the broker
 * already uses for /api/internal/deployment-ready (no new config either side).
 *
 * Body: { event, orgId?, userId? (landing User.id), sessionId?, projectId?,
 *         params?, debug? }
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMetaEvent } from "@/lib/meta-capi"
import { sendGa4Event, deterministicClientId } from "@/lib/ga4-mp"

export const runtime = "nodejs"

// Events the broker may emit. Keep in sync with the broker's
// internal/broker/analytics.go call sites. Allowlisted so a leaked token can't
// inject arbitrary funnel noise.
const ALLOWED_EVENTS = new Set([
  "generation_started",
  "generation_succeeded",
  "generation_failed",
])

interface Body {
  event?: string
  orgId?: string
  userId?: string
  sessionId?: string
  projectId?: string
  params?: Record<string, unknown>
  debug?: boolean
}

export async function POST(req: NextRequest) {
  const token = process.env.BROKER_INTERNAL_TOKEN
  const auth = req.headers.get("authorization") || ""
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, userId, sessionId, projectId, params, debug } = body
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown or disallowed event" }, { status: 400 })
  }

  // Resolve the user's email for Meta match (best-effort). userId is the
  // landing User.id (the broker's external_user_id).
  let email: string | null = null
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    email = user?.email ?? null
  }

  // Broker session/project ids aren't GA4's numeric session_id — carry them as
  // plain params, NOT as GA4 session_id (which must come from the _ga cookie).
  const eventParams: Record<string, unknown> = {
    ...(sessionId ? { broker_session: sessionId } : {}),
    ...(projectId ? { project_id: projectId } : {}),
    ...(params || {}),
  }

  // Fan out. Each no-ops if its secret/token isn't set; neither throws.
  const [ga4Result] = await Promise.all([
    sendGa4Event({
      eventName: event,
      // No real _ga cookie server-side → deterministic per-user client_id
      // (groups a user's events; doesn't tie to the original ad click).
      clientId: userId ? deterministicClientId(userId) : "",
      userId: userId || null,
      sessionId: null,
      params: eventParams,
      debug,
    }),
    sendMetaEvent({
      eventName: event, // Meta custom event, mirrors the browser taxonomy name
      email,
      // Stable id per (session, event) so a stray browser duplicate during a
      // deploy window would dedup rather than double-count.
      eventId: sessionId ? `${sessionId}:${event}` : undefined,
      customData: eventParams,
    }),
  ])

  return NextResponse.json({ ok: true, ...(debug ? { ga4Debug: ga4Result } : {}) })
}
