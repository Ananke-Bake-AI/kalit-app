import { APP_THEME_COLOR } from "@/lib/config"
import { DEFAULT_LOCALE } from "@/lib/i18n"
import { headers } from "next/headers"
import { Suspense } from "react"
import { Toaster } from "sonner"
import { GARouteTracker } from "@/components/analytics/ga-route-tracker"
import "@/styles/globals.scss"
import { fonts } from "./fonts"

export const viewport = {
  themeColor: APP_THEME_COLOR
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const locale = headerStore.get("x-locale") || DEFAULT_LOCALE

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning={true}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("dark-mode")==="1")document.documentElement.classList.add("dark")}catch(e){}})()`
          }}
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* Single gtag.js bootstrap. Loader src uses the GA4 ID so
            Google's tag-detector and the GA4 admin's "Test your site"
            check both pick up the install — the AW-* Ads tag rides
            on the same loader via the second gtag('config', …) call.
            Putting AW-* in the loader src instead used to make GA4
            report the tag as missing even though it was firing. */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-816EPS8GX8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-816EPS8GX8');
              gtag('config', 'AW-18025663729');
            `
          }}
        />
      </head>
      <body className={fonts}>
        {children}
        <Toaster position="top-right" theme="system" richColors closeButton />
        {/* Fires page_view to GA4 on every Next.js SPA navigation —
            the initial gtag('config', G-…) above only covers first paint.
            Suspense boundary because GARouteTracker reads useSearchParams. */}
        <Suspense fallback={null}>
          <GARouteTracker />
        </Suspense>
      </body>
    </html>
  )
}
