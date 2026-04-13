import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const secret = process.env.BROKER_JWT_SECRET || process.env.SUITE_JWT_SECRET || process.env.AUTH_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: "Server configuration error: missing signing secret" },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
    const token = await new SignJWT({
      email: session.user.email,
      name: session.user.name || null,
      orgId: session.user.orgId || null,
      isAdmin: session.user.isAdmin === true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .setSubject(session.user.id)
      .setIssuer("kalit-main")
      .sign(encoder.encode(secret))

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[broker/token] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
