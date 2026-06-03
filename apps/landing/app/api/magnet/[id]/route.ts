/**
 * GET   /api/magnet/[id] — funnel state (used by studio-client to decide
 *                          whether to reopen an existing build or start one).
 * PATCH /api/magnet/[id] — record the studio session id once the build kicks
 *                          off (and optionally the live preview URL).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const m = await prisma.magnetSession.findUnique({
    where: { id },
    select: {
      status: true,
      studioSessionId: true,
      previewUrl: true,
      input: true,
      teaser: true,
    },
  })
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 })
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
  }

  const existing = await prisma.magnetSession.findUnique({
    where: { id },
    select: { userId: true },
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
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true })
  }

  await prisma.magnetSession.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}
