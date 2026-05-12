import { APP_THEME_COLOR } from "@/lib/config"
import { DEFAULT_LOCALE } from "@/lib/i18n"
import { headers } from "next/headers"
import { Toaster } from "sonner"
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18025663729" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18025663729');
            `
          }}
        />
      </head>
      <body className={fonts}>
        {children}
        <Toaster position="top-right" theme="system" richColors closeButton />
      </body>
    </html>
  )
}
