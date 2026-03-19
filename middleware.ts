import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const authPages = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]
const appPages = ["/dashboard", "/project", "/flow", "/marketing", "/pentest", "/jobs", "/settings"]

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // API routes — pass through
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  const isSecure = req.nextUrl.protocol === "https:"
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token"
  const token = await getToken({ req, secret, cookieName })
  const isAuthenticated = !!token

  // Auth pages — redirect authenticated users to dashboard
  if (authPages.includes(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // Setup page — require auth, redirect if done
  if (pathname === "/setup") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (token?.onboardingDone) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // App pages — require auth + onboarding
  const isAppPage = appPages.some((p) => pathname === p || pathname.startsWith(p + "/"))
  if (isAppPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!token?.onboardingDone) {
      return NextResponse.redirect(new URL("/setup", req.url))
    }

    const suitePages = ["/project", "/flow", "/marketing", "/pentest"]
    if (suitePages.some((s) => pathname.startsWith(s)) && !token?.orgId) {
      return NextResponse.redirect(new URL("/setup", req.url))
    }
  }

  // Everything else (landing page /, static) — pass through
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|img).*)"],
}
