import { Providers } from "@/components/app/providers"
import { JsonLd } from "@/components/seo/json-ld"
import { auth } from "@/lib/auth"
import { LOCALES, isValidLocale, loadMessages, type Locale } from "@/lib/i18n"
import { notFound } from "next/navigation"

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params

  if (!isValidLocale(rawLocale)) notFound()
  const locale = rawLocale as Locale

  const session = await auth()
  const messages = await loadMessages(locale)

  return (
    <Providers session={session} locale={locale} messages={messages}>
      <JsonLd locale={locale} />
      {children}
    </Providers>
  )
}
