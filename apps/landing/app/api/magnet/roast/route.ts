/**
 * POST /api/magnet/roast — Roast-My-Landing-Page teaser.
 *
 * Anonymous (no auth). Validates + normalizes the URL, runs the teaser
 * engine, persists a MagnetSession (status "teaser"), and returns the
 * shareable result. The expensive build runs later, after signup.
 *
 * Rate-limited per IP so anonymous traffic can't burn Groq budget.
 */

import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { normalizeUrl, runTeaser, type TeaserMode } from "@/lib/magnet/teaser"

export const runtime = "nodejs"

// Simple in-memory token bucket per IP. Good enough for v1 single-instance;
// swap for Redis if the landing scales horizontally.
const RATE = { windowMs: 60 * 60 * 1000, max: 8 } // 8 teasers / IP / hour
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
  // opportunistic cleanup
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE.windowMs)) hits.delete(k)
    }
  }
  return false
}

function shareId(): string {
  return randomBytes(9).toString("base64url") // ~12 url-safe chars
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const url = normalizeUrl(String(body.url || ""))
  if (!url) {
    return NextResponse.json(
      { error: "Please enter a valid website URL." },
      { status: 400 },
    )
  }

  const ip = clientIp(req)
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "You've roasted a few pages already — try again in a bit." },
      { status: 429 },
    )
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Roast engine is not configured." },
      { status: 503 },
    )
  }

  // Mode: explicit body.mode (for the ?mode= A/B), else env default, else text.
  const envMode = process.env.MAGNET_TEASER_MODE === "vision" ? "vision" : "text"
  const mode: TeaserMode = body.mode === "vision" ? "vision" : body.mode === "text" ? "text" : envMode

  let teaser
  try {
    teaser = await runTeaser(url, mode)
  } catch (e) {
    console.error("[magnet/roast] teaser failed:", e)
    return NextResponse.json(
      { error: "Couldn't roast that page. Double-check the URL and retry." },
      { status: 502 },
    )
  }

  const utm = (body.utm && typeof body.utm === "object" ? body.utm : null) as
    | Record<string, unknown>
    | null

  const session = await prisma.magnetSession.create({
    data: {
      shareId: shareId(),
      door: "roast_landing",
      slug: "roast-landing",
      status: "teaser",
      input: { url },
      teaser: teaser as unknown as object,
      utm: (utm ?? undefined) as unknown as object | undefined,
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
      referredByShareId:
        typeof body.referredByShareId === "string"
          ? body.referredByShareId.slice(0, 64)
          : null,
    },
    select: { id: true, shareId: true },
  })

  return NextResponse.json({
    magnetSessionId: session.id,
    shareId: session.shareId,
    input: { url },
    teaser,
  })
}
