import { Wrapper } from "@/components/layout/wrapper"
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
      <link
        rel="preload"
        href="/fonts/cal-sans/CalSans-SemiBold.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <body className={fonts}>
        <Wrapper>{children}</Wrapper>
      </body>
    </html>
  )
}
