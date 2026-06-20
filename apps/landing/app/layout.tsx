import { APP_THEME_COLOR } from "@/lib/config"
import { DEFAULT_LOCALE } from "@/lib/i18n"
import { headers } from "next/headers"
import { Suspense } from "react"
import { Toast } from "@/components/layout/toast"
import { GARouteTracker } from "@/components/analytics/ga-route-tracker"
import { FbPixelRouteTracker } from "@/components/analytics/fb-pixel-route-tracker"
import { FB_PIXEL_ID } from "@/lib/fbpixel"
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
            __html: `(function(){try{var e=document.documentElement;e.classList.add("js");if(localStorage.getItem("dark-mode")==="1")e.classList.add("dark")}catch(e){}})()`
          }}
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
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
        {/* Google Tag Manager — container GTM-WNSM869M, sits next to
            the direct gtag.js snippet above. GTM and direct gtag can
            coexist (they share the same `dataLayer` global). Tags
            wired up inside GTM (third-party pixels, custom events,
            etc.) fire from here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WNSM869M');`
          }}
        />
        {/* Meta (Facebook) Pixel — base + initial PageView. SPA navigations
            fire PageView via <FbPixelRouteTracker/>; conversions are mirrored
            from the dataLayer in lib/fbpixel.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FB_PIXEL_ID}');fbq('track','PageView');`
          }}
        />
      </head>
      <body className={fonts}>
        {/* Google Tag Manager (noscript) fallback. Required by GTM's
            install — fires the tags for visitors who block JS. */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WNSM869M"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* Meta Pixel noscript fallback. */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
        {/* Single global toaster — the styled <Toast/> is mounted here only.
            It used to also be rendered in the layout wrapper + studio-shell,
            so every toast appeared twice (top-right + bottom-right). */}
        <Toast />
        {/* Fires page_view to GA4 on every Next.js SPA navigation —
            the initial gtag('config', G-…) above only covers first paint.
            Suspense boundary because GARouteTracker reads useSearchParams. */}
        <Suspense fallback={null}>
          <GARouteTracker />
          <FbPixelRouteTracker />
        </Suspense>
      </body>
    </html>
  )
}
