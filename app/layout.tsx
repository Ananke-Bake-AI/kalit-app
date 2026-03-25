import { Providers } from "@/components/app/providers"
import { JsonLd } from "@/components/seo/json-ld"
import { APP_THEME_COLOR } from "@/lib/config"
import { MetadataSeo } from "@/lib/metadata"
import "@/styles/globals.scss"
import { fonts } from "./fonts"

export const metadata = MetadataSeo({
  title: "Build, Launch, Grow, and Secure with AI",
  description:
    "Kalit is the AI suite for startups and digital teams. Build apps, launch landing pages, run marketing campaigns, and secure your product — all from one platform."
})

export const viewport = {
  themeColor: APP_THEME_COLOR
}

export interface LayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning={true}>
      <head>
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
        <JsonLd />
      </head>
      <body className={fonts}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
