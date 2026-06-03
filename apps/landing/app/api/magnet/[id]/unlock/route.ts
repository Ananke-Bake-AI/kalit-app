/**
 * POST /api/magnet/[id]/unlock
 *
 * Reveals the full idea brief (business model, GTM, competitors, MVP) that the
 * anonymous teaser withholds. Requires auth — signing up IS the unlock, which
 * is how the magnet captures the lead. Attaches the session to the user on
 * first unlock (status "claimed"). No org/trial provisioning here; that only
 * happens if they go on to build a demo in Flow (see ./claim).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { IdeaTeaser } from "@/lib/magnet/idea-types"

export const runtime = "nodejs"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const m = await prisma.magnetSession.findUnique({ where: { id } })
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (m.door !== "idea_finder") {
    return NextResponse.json({ error: "Wrong magnet" }, { status: 400 })
  }
  if (m.userId && m.userId !== userId) {
    return NextResponse.json({ error: "Already claimed" }, { status: 403 })
  }

  // Attach the lead on first unlock (don't downgrade a later status).
  if (!m.userId) {
    await prisma.magnetSession.update({
      where: { id },
      data: {
        userId,
        status: m.status === "teaser" ? "claimed" : m.status,
        claimedAt: m.claimedAt ?? new Date(),
      },
    })
  }

  const teaser = (m.teaser || {}) as unknown as IdeaTeaser
  return NextResponse.json({
    founderSummary: teaser.founderSummary || "",
    ideas: teaser.ideas || [],
    topProjectId: teaser.topProjectId || null,
  })
}
