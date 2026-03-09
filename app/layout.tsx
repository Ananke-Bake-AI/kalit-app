import { Wrapper } from "@/components/layout/wrapper"
import { APP_THEME_COLOR } from "@/lib/config"
import { MetadataSeo } from "@/lib/metadata"
import "@/styles/globals.scss"
import type { LayoutProps } from "@/types/layout"
import { fonts } from "./fonts"

export const metadata = MetadataSeo({
  title: "My WebApp",
  description: "My WebApp description"
})

export const viewport = {
  themeColor: APP_THEME_COLOR
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning={true}>
      <body className={fonts}>
        <Wrapper>{children}</Wrapper>
      </body>
    </html>
  )
}
