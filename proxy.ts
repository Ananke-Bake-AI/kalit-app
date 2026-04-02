import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"]
const appPages = ["/dashboard", "/jobs", "/settings"]

export const proxy = auth((req) => {
  const pathname = req.nextUrl.pathname
  const session = req.auth
  const isAuthenticated = !!session?.user

  if (authPages.includes(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  if (pathname === "/setup") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (session?.user?.onboardingDone) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  }

  const isAppPage = appPages.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (isAppPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!session?.user?.onboardingDone) {
      return NextResponse.redirect(new URL("/setup", req.url))
    }

    const suitePages = ["/project", "/flow", "/marketing", "/pentest"]
    if (suitePages.some((s) => pathname.startsWith(s)) && !session?.user?.orgId) {
      return NextResponse.redirect(new URL("/setup", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts|img).*)"]
}
