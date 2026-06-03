/**
 * POST /api/internal/deployment-ready
 *
 * Called by the broker (server-to-server) when a studio build finishes
 * deploying, so we can email the user the live link — they shouldn't have to
 * sit and watch a multi-minute build. Auth via the shared BROKER_INTERNAL_TOKEN.
 *
 * Body: { externalUserId: string (landing User.id), deployedUrl: string,
 *         projectName?: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBuildReadyEmail } from "@/lib/email"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const token = process.env.BROKER_INTERNAL_TOKEN
  const auth = req.headers.get("authorization") || ""
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { externalUserId?: string; deployedUrl?: string; projectName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { externalUserId, deployedUrl, projectName } = body
  if (!externalUserId || !deployedUrl || !/^https?:\/\//.test(deployedUrl)) {
    return NextResponse.json({ error: "Missing externalUserId or deployedUrl" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: externalUserId },
    select: { email: true, name: true, emailUnsubscribed: true },
  })
  if (!user?.email) {
    // Unknown user — ack so the broker doesn't retry forever.
    return NextResponse.json({ ok: true, skipped: "no_user" })
  }
  if (user.emailUnsubscribed) {
    return NextResponse.json({ ok: true, skipped: "unsubscribed" })
  }

  try {
    await sendBuildReadyEmail({
      email: user.email,
      name: user.name,
      url: deployedUrl,
      projectName: projectName || null,
    })
  } catch (e) {
    console.error("[deployment-ready] email failed:", e)
    return NextResponse.json({ error: "send failed" }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
