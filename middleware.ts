import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const authPages = ["/login", "/register"]
const appPages = ["/dashboard", "/project", "/flow", "/marketing", "/pentest", "/jobs", "/settings"]

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth
  const pathname = nextUrl.pathname

  // API routes — pass through
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Auth pages — redirect authenticated users to dashboard
  if (authPages.includes(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  // Setup page — require auth, redirect if done
  if (pathname === "/setup") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    if (req.auth?.user?.onboardingDone) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  // App pages — require auth + onboarding
  const isAppPage = appPages.some((p) => pathname === p || pathname.startsWith(p + "/"))
  if (isAppPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", nextUrl)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!req.auth?.user?.onboardingDone) {
      return NextResponse.redirect(new URL("/setup", nextUrl))
    }

    const suitePages = ["/project", "/flow", "/marketing", "/pentest"]
    if (suitePages.some((s) => pathname.startsWith(s)) && !req.auth?.user?.orgId) {
      return NextResponse.redirect(new URL("/setup", nextUrl))
    }
  }

  // Everything else (landing page /, static) — pass through
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|img).*)"],
}
