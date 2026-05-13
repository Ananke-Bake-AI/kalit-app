import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { getServerTranslation, getTranslationForLocale } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import s from "./support.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const t = await getTranslationForLocale(locale)
  return MetadataSeo({
    fullTitle: t("supportPage.metaTitle"),
    description: t("supportPage.metaDescription"),
    locale,
    pathname: "/support"
  })
}

export default async function SupportPage() {
  const { t } = await getServerTranslation()

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={t("supportPage.title")}
          description={t("supportPage.description")}
        />

        <div className={s.grid}>
          <div className={s.card}>
            <h2 className={s.cardTitle}>{t("supportPage.emailTitle")}</h2>
            <p className={s.cardText}>
              {t("supportPage.emailText")}
            </p>
            <a href="mailto:contact@kalit.ai" className={s.cardLink}>
              contact@kalit.ai
            </a>
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>{t("supportPage.faqTitle")}</h2>
            <p className={s.cardText}>
              {t("supportPage.faqText")}
            </p>
            <Link href="/faq" className={s.cardLink}>
              {t("supportPage.faqLink")}
            </Link>
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>{t("supportPage.contactTitle")}</h2>
            <p className={s.cardText}>
              {t("supportPage.contactText")}
            </p>
            <Link href="/contact-us" className={s.cardLink}>
              {t("supportPage.contactLink")}
            </Link>
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>{t("supportPage.discordTitle")}</h2>
            <p className={s.cardText}>
              {t("supportPage.discordText")}
            </p>
            <Link href="https://discord.gg/FssPgq5hQK" className={s.cardLink}>
              {t("supportPage.discordLink")}
            </Link>
          </div>
        </div>
      </Container>
    </PageSection>
  )
}
