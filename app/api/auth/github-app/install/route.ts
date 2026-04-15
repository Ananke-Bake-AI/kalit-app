import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { getGitHubAppConfig, installUrl } from "@/lib/github-app"

// GET /api/auth/github-app/install
// Redirects the signed-in user to GitHub to install (or reconfigure) the app.
// CSRF-protected by a state cookie that the callback verifies.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const cfg = getGitHubAppConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: "GitHub App is not configured on this server." },
      { status: 503 },
    )
  }
  const state = randomBytes(24).toString("base64url")
  const res = NextResponse.redirect(installUrl(cfg, state))
  res.cookies.set("gh_app_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
  return res
}
