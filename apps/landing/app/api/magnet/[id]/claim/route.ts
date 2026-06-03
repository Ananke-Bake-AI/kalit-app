/**
 * POST /api/magnet/[id]/claim
 *
 * Called from the studio right after a magnet visitor signs up. Provisions a
 * default org + trial (so the build can run without the /setup wall), attaches
 * the magnet session to the user, and returns the seed prompt that drives the
 * pre-seeded studio build (import → rebuild → deploy).
 *
 * `provisioned: true` tells the client to refresh its NextAuth session
 * (trigger "update") so the new orgId lands in the JWT before it mints a
 * broker token and creates the studio session.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ensureOrgWithTrial } from "@/lib/magnet/provision"
import { buildSeedPrompt } from "@/lib/magnet/prompt"

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

  // If someone else already claimed this teaser, don't hijack it.
  if (m.userId && m.userId !== userId) {
    return NextResponse.json({ error: "Already claimed" }, { status: 403 })
  }

  const alreadyStarted = m.status !== "teaser" && !!m.studioSessionId

  const { orgId, provisioned } = await ensureOrgWithTrial(
    userId,
    session.user.name || (session.user.email ? session.user.email.split("@")[0] : null),
  )

  if (m.status === "teaser") {
    await prisma.magnetSession.update({
      where: { id },
      data: { userId, orgId, status: "claimed", claimedAt: new Date() },
    })
  }

  const input = (m.input || {}) as { url?: string }
  const teaser = (m.teaser || {}) as { problems?: { title: string; detail: string }[] }
  const prompt = buildSeedPrompt(input.url || "", teaser.problems || [])

  return NextResponse.json({
    prompt,
    provisioned,
    alreadyStarted,
    studioSessionId: m.studioSessionId,
    orgId,
  })
}
