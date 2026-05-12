import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { COOKIE_NAME, DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "@/lib/i18n"

const localeSet = new Set<string>(LOCALES)
const STATIC_EXT = /\.(?:js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|map|json)$/

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"]
const appPages = ["/dashboard", "/jobs", "/settings", "/studio"]

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  // --- Locale detection ---
  const segments = pathname.split("/")
  const maybeLocale = segments[1]

  // 1. /en/* → 308 redirect to strip default locale prefix (canonical URL).
  //
  // Disabled on self-hosted Node because middleware re-runs after our
  // internal rewrite (/ → /en/<path>) and the strip bounces it back to /,
  // re-triggering the rewrite — infinite loop, no page ever renders. On
  // Vercel this loop never materializes (middleware doesn't re-fire after
  // an internal rewrite). Re-enable when the strip can be safely
  // distinguished from a rewrite re-entry — for now /en/* renders directly
  // and stays in the URL bar; non-default locales (/fr, /es, …) keep their
  // canonical-prefix behavior since rule 1 only matched DEFAULT_LOCALE.

  // 2. Determine locale + bare path
  let locale: Locale = DEFAULT_LOCALE
  let barePath = pathname
  if (maybeLocale && localeSet.has(maybeLocale)) {
    locale = maybeLocale as Locale
    barePath = "/" + segments.slice(2).join("/") || "/"
  }

  // 3. Root "/" → redirect to preferred locale if non-default
  if (pathname === "/") {
    const preferred = detectPreferred(req)
    if (preferred !== DEFAULT_LOCALE) {
      const url = req.nextUrl.clone()
      url.pathname = `/${preferred}`
      return NextResponse.redirect(url)
    }
  }

  // --- Auth checks (on barePath) ---
  const session = req.auth
  const isAuthenticated = !!session?.user

  if (authPages.includes(barePath)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(localePath("/dashboard", locale), req.url))
    }
    return localeRewrite(req, pathname, locale)
  }

  if (barePath === "/setup") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(localePath("/login", locale), req.url))
    }
    if (session?.user?.onboardingDone) {
      return NextResponse.redirect(new URL(localePath("/dashboard", locale), req.url))
    }
    return localeRewrite(req, pathname, locale)
  }

  const isAppPage = appPages.some((p) => barePath === p || barePath.startsWith(`${p}/`))
  if (isAppPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL(localePath("/login", locale), req.url)
      loginUrl.searchParams.set("callbackUrl", localePath(barePath, locale))
      return NextResponse.redirect(loginUrl)
    }

    if (!session?.user?.onboardingDone) {
      return NextResponse.redirect(new URL(localePath("/setup", locale), req.url))
    }

    const suitePages = ["/project", "/flow", "/marketing", "/pentest"]
    if (suitePages.some((s) => barePath.startsWith(s)) && !session?.user?.orgId) {
      return NextResponse.redirect(new URL(localePath("/setup", locale), req.url))
    }
  }

  return localeRewrite(req, pathname, locale)
})

/** If path already has locale prefix, pass through with x-locale header. Otherwise rewrite bare path to /en/<path>. */
function localeRewrite(req: NextRequest, pathname: string, locale: Locale) {
  const segments = pathname.split("/")
  const maybeLocale = segments[1]

  if (maybeLocale && localeSet.has(maybeLocale)) {
    // Already has locale prefix → pass through with header
    const headers = new Headers(req.headers)
    headers.set("x-locale", locale)
    return NextResponse.next({ request: { headers } })
  }

  // Bare path → rewrite internally to /en/<path>.
  // We clone req.nextUrl (rather than building `new URL(path, req.url)`) so
  // the rewrite stays anchored to the parsed request origin — keeping it
  // internal instead of falling back to a fetch-proxy through public DNS.
  // x-locale-rewrite=1 tells rule 1 above to NOT re-strip /en on the
  // rewritten request (on self-hosted Next.js middleware re-runs after a
  // rewrite, which would otherwise infinite-loop / → /en → / → /en …).
  const target = req.nextUrl.clone()
  target.pathname = `/${DEFAULT_LOCALE}${pathname}`
  const headers = new Headers(req.headers)
  headers.set("x-locale", DEFAULT_LOCALE)
  headers.set("x-locale-rewrite", "1")
  return NextResponse.rewrite(target, { request: { headers } })
}

function detectPreferred(request: NextRequest): Locale {
  const cookie = request.cookies.get(COOKIE_NAME)?.value
  if (cookie && localeSet.has(cookie)) return cookie as Locale

  const accept = request.headers.get("accept-language")
  if (!accept) return DEFAULT_LOCALE

  const languages = accept
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=")
      return { lang: lang.trim().toLowerCase().slice(0, 2), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { lang } of languages) {
    if (localeSet.has(lang)) return lang as Locale
  }
  return DEFAULT_LOCALE
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon[^/]*|fonts|img|sitemap|robots).*)"]
}
