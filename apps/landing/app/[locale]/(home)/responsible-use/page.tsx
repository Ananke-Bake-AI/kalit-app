import { Container } from "@/components/container"
import clsx from "clsx"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import legal from "@/components/legal-document/legal-document.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).responsibleUse
  return MetadataSeo({
    fullTitle: c.metaTitle,
    description: c.metaDescription,
    locale,
    pathname: "/responsible-use"
  })
}

export default async function ResponsibleUsePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).responsibleUse

  return (
    <PageSection>
      <Container>
        <PageHeader title={c.title} description={c.subtitle} />

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <p>
            {c.intro.split("Terms of Service")[0]}
            <Link href="/terms-of-service">Terms of Service</Link>
            {c.intro.split("Terms of Service")[1] || "."}
          </p>

          <h2>{c.authTitle}</h2>
          <p>{c.authIntro}</p>
          <ul>
            {c.authBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p>{c.authConfirm}</p>

          <h2>{c.prohibitedTitle}</h2>
          <p>{c.prohibitedIntro}</p>
          <ul>
            {c.prohibitedBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p>{c.prohibitedNote}</p>

          <h2>{c.evidenceTitle}</h2>
          <p>{c.evidenceIntro}</p>
          <ul>
            {c.evidenceBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          <h2>{c.generalTitle}</h2>
          <p>{c.generalIntro}</p>
          <ul>
            {c.generalBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>

          <h2>{c.outputTitle}</h2>
          <p>{c.outputIntro}</p>
          <ul>
            {c.outputBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p>{c.outputNote}</p>

          <h2>{c.enforcementTitle}</h2>
          <p>{c.enforcementIntro}</p>
          <ul>
            {c.enforcementBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p>{c.enforcementNote}</p>

          <h2>{c.reportTitle}</h2>
          <p>
            {c.reportText.split("abuse@kalit.ai")[0]}
            <a href="mailto:abuse@kalit.ai">abuse@kalit.ai</a>
            {c.reportText.split("abuse@kalit.ai")[1] || ""}
          </p>

          <h2>{c.updatesTitle}</h2>
          <p>{c.updatesText}</p>

          <h2>{c.contactTitle}</h2>
          <p>
            <strong>abuse@kalit.ai</strong>
            <br />
            <strong>security@kalit.ai</strong>
            <br />
            <strong>contact@kalit.ai</strong>
          </p>
        </article>
      </Container>
    </PageSection>
  )
}
