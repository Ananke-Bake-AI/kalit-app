import { redirect } from "next/navigation"
import { SignJWT } from "jose"
import { auth } from "@/lib/auth"
import { DesktopAuthRedirect } from "./redirect-client"

const ALLOWED_REDIRECT_SCHEMES = ["kalit://", "kalitstudio://"]

function getSafeRedirect(raw: string | undefined): string {
  if (!raw) return "kalit://auth/callback"
  if (ALLOWED_REDIRECT_SCHEMES.some((s) => raw.startsWith(s))) return raw
  return "kalit://auth/callback"
}

async function signDesktopToken(userId: string, email: string, name: string | null, orgId: string | null, isAdmin: boolean) {
  const secret =
    process.env.BROKER_JWT_SECRET ||
    process.env.SUITE_JWT_SECRET ||
    process.env.AUTH_SECRET
  if (!secret) throw new Error("Missing signing secret")

  const encoder = new TextEncoder()
  return new SignJWT({
    email,
    name: name || null,
    orgId: orgId || null,
    isAdmin: isAdmin === true,
    externalUserId: userId,
    externalOrgId: orgId || null,
    audience: "desktop",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setSubject(userId)
    .setIssuer("kalit-main")
    .sign(encoder.encode(secret))
}

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
}

export default async function DesktopAuthPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { redirect: redirectParam } = await searchParams

  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    const callback = `/${locale}/auth/desktop${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(callback)}`)
  }

  const token = await signDesktopToken(
    session.user.id,
    session.user.email,
    session.user.name ?? null,
    session.user.orgId ?? null,
    session.user.isAdmin === true,
  )

  const target = getSafeRedirect(redirectParam)
  const userPayload = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    isAdmin: session.user.isAdmin === true,
  }
  const deepLink = `${target}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userPayload))}`

  return <DesktopAuthRedirect deepLink={deepLink} userEmail={session.user.email} />
}
