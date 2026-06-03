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
import { buildIdeaSeedPrompt } from "@/lib/magnet/idea-prompt"
import { fetchIdea } from "@/lib/magnet/scout"

export const runtime = "nodejs"

// Build the seed prompt for whichever magnet door claimed this session. Roast
// rebuilds the visitor's own page; idea-finder builds a demo landing for the
// matched Search idea.
async function seedPromptFor(m: {
  door: string
  input: unknown
  teaser: unknown
}): Promise<string> {
  if (m.door === "idea_finder") {
    const input = (m.input || {}) as { buildProjectId?: string }
    const pid = input.buildProjectId
    if (pid) {
      const project = await fetchIdea(pid)
      if (project) return buildIdeaSeedPrompt(project)
    }
    // Fallback: describe the top matched idea from the stored teaser.
    const teaser = (m.teaser || {}) as {
      ideas?: { name?: string; tagline?: string; demoIdea?: string }[]
    }
    const top = teaser.ideas?.[0]
    if (top?.name) {
      return `Build a polished, high-converting demo landing page for a startup called "${top.name}". ${top.tagline || ""} ${top.demoIdea || ""}\n\nWrite real, concrete marketing copy (no placeholders): a strong hero with a clear value proposition, core benefits, how it works, credibility cues, and one prominent call to action (waitlist / early access). Then deploy it and give me the live preview URL.`.trim()
    }
    return "Build a polished, modern demo landing page with a strong hero, clear value proposition and a single prominent call to action, then deploy it and give me the live preview URL."
  }
  const input = (m.input || {}) as { url?: string }
  const teaser = (m.teaser || {}) as { problems?: { title: string; detail: string }[] }
  return buildSeedPrompt(input.url || "", teaser.problems || [])
}

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

  // Guard against a stale session whose user.id no longer exists (else the
  // org/membership provision below fails with an opaque FK 500). Tell the
  // client to re-authenticate instead.
  const userRow = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!userRow) {
    return NextResponse.json(
      { error: "Your session expired — please sign in again." },
      { status: 401 },
    )
  }

  const m = await prisma.magnetSession.findUnique({ where: { id } })
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // If someone else already claimed this teaser, don't hijack it.
  if (m.userId && m.userId !== userId) {
    return NextResponse.json({ error: "Already claimed" }, { status: 403 })
  }

  const alreadyStarted = m.status !== "teaser" && !!m.studioSessionId

  let orgId: string
  let provisioned: boolean
  try {
    ;({ orgId, provisioned } = await ensureOrgWithTrial(
      userId,
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : null),
    ))
  } catch (e) {
    console.error("[magnet/claim] provisioning failed:", e)
    return NextResponse.json({ error: "Could not start the build. Try again." }, { status: 500 })
  }

  if (m.status === "teaser") {
    await prisma.magnetSession.update({
      where: { id },
      data: { userId, orgId, status: "claimed", claimedAt: new Date() },
    })
  }

  const prompt = await seedPromptFor(m)

  return NextResponse.json({
    prompt,
    provisioned,
    alreadyStarted,
    studioSessionId: m.studioSessionId,
    orgId,
  })
}
