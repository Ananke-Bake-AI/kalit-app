/**
 * POST /api/magnet/idea — Idea-Finder scout teaser.
 *
 * Anonymous (no auth). Takes a founder profile, runs the scout (Search query +
 * grounding), persists a MagnetSession (door "idea_finder", status "teaser"),
 * and returns a GATED preview of the matched ideas. The full brief (business
 * model, GTM, competitors, MVP) is withheld here and unlocked after signup —
 * see /api/magnet/[id]/unlock. Rate-limited per IP to bound Groq spend.
 */
import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { previewIdea, runScout, type ScoutProfile } from "@/lib/magnet/scout"

export const runtime = "nodejs"

const RATE = { windowMs: 60 * 60 * 1000, max: 6 } // 6 scouts / IP / hour
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs)
  if (arr.length >= RATE.max) {
    hits.set(ip, arr)
    return true
  }
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE.windowMs)) hits.delete(k)
    }
  }
  return false
}

function shareId(): string {
  return randomBytes(9).toString("base64url")
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

function cleanProfile(raw: unknown): ScoutProfile | null {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const goal = typeof p.goal === "string" ? p.goal.trim().slice(0, 600) : ""
  const interests = Array.isArray(p.interests)
    ? p.interests.map((i) => String(i).trim().slice(0, 60)).filter(Boolean).slice(0, 8)
    : []
  const audience = typeof p.audience === "string" ? p.audience.trim().slice(0, 80) : ""
  const stage = typeof p.stage === "string" ? p.stage.trim().slice(0, 80) : ""
  if (!goal && interests.length === 0) return null
  return { goal, interests, audience, stage }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const profile = cleanProfile(body.profile)
  if (!profile) {
    return NextResponse.json(
      { error: "Tell me a bit about what you'd like to build first." },
      { status: 400 },
    )
  }

  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "You've explored a few ideas already. Give it a minute and try again." },
      { status: 429 },
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Idea engine is not configured." }, { status: 503 })
  }

  let scout
  try {
    scout = await runScout(profile)
  } catch (e) {
    console.error("[magnet/idea] scout failed:", e)
    return NextResponse.json(
      { error: "Couldn't reach the idea engine. Please try again." },
      { status: 502 },
    )
  }

  if (scout.ideas.length === 0) {
    return NextResponse.json(
      { error: "No strong matches yet. Try broadening your interests a little." },
      { status: 422 },
    )
  }

  const utm = (body.utm && typeof body.utm === "object" ? body.utm : null) as
    | Record<string, unknown>
    | null

  const session = await prisma.magnetSession.create({
    data: {
      shareId: shareId(),
      door: "idea_finder",
      slug: "idea-finder",
      status: "teaser",
      input: { profile, buildProjectId: scout.topProjectId } as unknown as object,
      teaser: {
        profile: scout.profile,
        founderSummary: scout.founderSummary,
        ideas: scout.ideas,
        topProjectId: scout.topProjectId,
      } as unknown as object,
      utm: (utm ?? undefined) as unknown as object | undefined,
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
      referredByShareId:
        typeof body.referredByShareId === "string" ? body.referredByShareId.slice(0, 64) : null,
    },
    select: { id: true, shareId: true },
  })

  return NextResponse.json({
    magnetSessionId: session.id,
    shareId: session.shareId,
    founderSummary: scout.founderSummary,
    ideas: scout.ideas.map(previewIdea),
    topProjectId: scout.topProjectId,
  })
}
