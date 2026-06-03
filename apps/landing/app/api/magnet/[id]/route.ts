/**
 * GET   /api/magnet/[id] — funnel state (used by studio-client to decide
 *                          whether to reopen an existing build or start one).
 * PATCH /api/magnet/[id] — record the studio session id once the build kicks
 *                          off (and optionally the live preview URL).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { previewIdea } from "@/lib/magnet/idea-types"
import type { IdeaTeaser } from "@/lib/magnet/idea-types"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const m = await prisma.magnetSession.findUnique({
    where: { id },
    select: {
      door: true,
      status: true,
      studioSessionId: true,
      previewUrl: true,
      input: true,
      teaser: true,
    },
  })
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // The idea-finder teaser holds the FULL brief server-side — never return its
  // gated fields to an unauthenticated reader. Strip down to the preview; the
  // full brief is only served by /unlock (auth) or the share page (server).
  if (m.door === "idea_finder") {
    const t = (m.teaser || {}) as unknown as IdeaTeaser
    return NextResponse.json({
      door: m.door,
      status: m.status,
      studioSessionId: m.studioSessionId,
      previewUrl: m.previewUrl,
      founderSummary: t.founderSummary || "",
      ideas: (t.ideas || []).map(previewIdea),
      topProjectId: t.topProjectId || null,
    })
  }

  return NextResponse.json(m)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    studioSessionId?: string
    previewUrl?: string
    status?: string
    buildProjectId?: string
  }

  const existing = await prisma.magnetSession.findUnique({
    where: { id },
    select: { userId: true, input: true },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  // Only the owner (the user who claimed it) may mutate it.
  if (existing.userId && existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.studioSessionId === "string") {
    data.studioSessionId = body.studioSessionId
    data.status = "building"
  }
  if (typeof body.previewUrl === "string") {
    data.previewUrl = body.previewUrl
    data.status = "built"
    data.builtAt = new Date()
  }
  // Record which matched idea the user chose to build (idea-finder → Flow). The
  // claim route reads input.buildProjectId to seed the demo build.
  if (typeof body.buildProjectId === "string" && body.buildProjectId) {
    const input = (existing.input || {}) as Record<string, unknown>
    data.input = { ...input, buildProjectId: body.buildProjectId }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true })
  }

  await prisma.magnetSession.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}
