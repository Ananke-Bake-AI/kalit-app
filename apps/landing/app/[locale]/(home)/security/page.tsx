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
  const c = (await getPageStrings(locale)).security
  return MetadataSeo({
    fullTitle: c.metaTitle,
    description: c.metaDescription,
    locale,
    pathname: "/security"
  })
}

export default async function SecurityPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).security

  return (
    <PageSection>
      <Container>
        <PageHeader title={c.title} description={c.subtitle} />

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <p>
            {c.intro.split("security@kalit.ai")[0]}
            <a href="mailto:security@kalit.ai">security@kalit.ai</a>
            {c.intro.split("security@kalit.ai")[1] || "."}
          </p>

          <h2>{c.encryptionTitle}</h2>
          <ul>
            <li>{c.encryptionInTransit}</li>
            <li>{c.encryptionAtRest}</li>
            <li>{c.encryptionSecrets}</li>
          </ul>

          <h2>{c.authTitle}</h2>
          <p>{c.authText}</p>

          <h2>{c.residencyTitle}</h2>
          <p>{c.residencyText}</p>

          <h2>{c.subprocessorsTitle}</h2>
          <p>{c.subprocessorsIntro}</p>
          <ul>
            {c.subprocessorsList.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
          <p>{c.subprocessorsNote}</p>

          <h2>{c.accessTitle}</h2>
          <ul>
            {c.accessList.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>

          <h2>{c.pentestTitle}</h2>
          <p>{c.pentestText} <Link href="/responsible-use">{(await getPageStrings(locale)).pentestExtras.authCta}</Link>.</p>
          <p>{c.pentestEgress}</p>

          <h2>{c.disclosureTitle}</h2>
          <p>
            {c.disclosureText.split("security@kalit.ai")[0]}
            <a href="mailto:security@kalit.ai">security@kalit.ai</a>
            {c.disclosureText.split("security@kalit.ai")[1] || ""}
          </p>
          <ul>
            {c.disclosureCommitments.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
          <p>{c.disclosureBounty}</p>

          <h2>{c.incidentTitle}</h2>
          <p>{c.incidentText}</p>

          <h2>{c.complianceTitle}</h2>
          <p>{c.complianceText}</p>

          <h2>{c.contactTitle}</h2>
          <p>{c.contactText}</p>
          <p>
            <strong>security@kalit.ai</strong>
            <br />
            {c.contactAddress}
          </p>
        </article>
      </Container>
    </PageSection>
  )
}
