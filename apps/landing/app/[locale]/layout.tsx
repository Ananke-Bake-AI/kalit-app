import { Providers } from "@/components/app/providers"
import { JsonLd } from "@/components/seo/json-ld"
import { safeAuth } from "@/lib/auth"
import { LOCALES, isValidLocale, loadMessages, type Locale } from "@/lib/i18n"
import { getTranslationForLocale } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import { notFound } from "next/navigation"

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? raw as Locale : "en"
  const t = await getTranslationForLocale(locale)
  return MetadataSeo({
    title: t("seo.homeTitle"),
    description: t("seo.homeDescription"),
    locale,
    pathname: "/"
  })
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params

  if (!isValidLocale(rawLocale)) notFound()
  const locale = rawLocale as Locale

  const session = await safeAuth()
  const messages = await loadMessages(locale)

  return (
    <Providers session={session} locale={locale} messages={messages}>
      <JsonLd locale={locale} />
      {children}
    </Providers>
  )
}
