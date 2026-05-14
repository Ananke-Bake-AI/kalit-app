import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { PageSection } from "@/components/page-section"
import { PolicyToc } from "@/components/policy-page/policy-toc"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import s from "@/components/policy-page/policy-page.module.scss"

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

interface Section {
  id: string
  icon: string
  title: string
  body: React.ReactNode
}

export default async function SecurityPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).security
  const pe = (await getPageStrings(locale)).pentestExtras

  // The intro contains a literal "security@kalit.ai" we want to render as a
  // mailto link without doing fragile string splits in JSX.
  const introParts = c.intro.split("security@kalit.ai")
  const disclosureParts = c.disclosureText.split("security@kalit.ai")

  const sections: Section[] = [
    {
      id: "encryption",
      icon: "hugeicons:lock-key",
      title: c.encryptionTitle,
      body: (
        <ul>
          <li>{c.encryptionInTransit}</li>
          <li>{c.encryptionAtRest}</li>
          <li>{c.encryptionSecrets}</li>
        </ul>
      )
    },
    {
      id: "auth",
      icon: "hugeicons:fingerprint-scan",
      title: c.authTitle,
      body: <p>{c.authText}</p>
    },
    {
      id: "residency",
      icon: "hugeicons:globe-02",
      title: c.residencyTitle,
      body: <p>{c.residencyText}</p>
    },
    {
      id: "subprocessors",
      icon: "hugeicons:building-04",
      title: c.subprocessorsTitle,
      body: (
        <>
          <p>{c.subprocessorsIntro}</p>
          <ul>
            {c.subprocessorsList.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
          <p>{c.subprocessorsNote}</p>
        </>
      )
    },
    {
      id: "access",
      icon: "hugeicons:user-shield-02",
      title: c.accessTitle,
      body: (
        <ul>
          {c.accessList.map((entry, i) => (
            <li key={i}>{entry}</li>
          ))}
        </ul>
      )
    },
    {
      id: "pentest",
      icon: "hugeicons:bug-01",
      title: c.pentestTitle,
      body: (
        <>
          <p>
            {c.pentestText} <Link href="/responsible-use">{pe.authCta}</Link>.
          </p>
          <p>{c.pentestEgress}</p>
        </>
      )
    },
    {
      id: "disclosure",
      icon: "hugeicons:shield-vulnerability",
      title: c.disclosureTitle,
      body: (
        <>
          <p>
            {disclosureParts[0]}
            <a href="mailto:security@kalit.ai">security@kalit.ai</a>
            {disclosureParts[1] || ""}
          </p>
          <ul>
            {c.disclosureCommitments.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
          <p>{c.disclosureBounty}</p>
        </>
      )
    },
    {
      id: "incident",
      icon: "hugeicons:alert-square",
      title: c.incidentTitle,
      body: <p>{c.incidentText}</p>
    },
    {
      id: "compliance",
      icon: "hugeicons:certificate-01",
      title: c.complianceTitle,
      body: <p>{c.complianceText}</p>
    }
  ]

  return (
    <PageSection>
      <Container>
        {/* ── Header ───────────────────────────── */}
        <div className={s.head}>
          <span className={s.eyebrow}>
            <Icon icon="hugeicons:shield-01" /> {c.metaTitle.split(" - ")[0]}
          </span>
          <h1 className={s.title}>{c.title}</h1>
          <p className={s.lede}>{c.subtitle}</p>
          <div className={s.metaRow}>
            <span>
              <Icon icon="hugeicons:mail-01" />
              <a href="mailto:security@kalit.ai">security@kalit.ai</a>
            </span>
            <span>
              <Icon icon="hugeicons:location-01" />
              Malta · EU
            </span>
            <span>
              <Icon icon="hugeicons:legal-document-01" />
              Merkle Tech Labs LTD. (C 107851)
            </span>
          </div>
        </div>

        {/* ── Trust strip ──────────────────────── */}
        <div className={s.trustStrip}>
          <div className={s.trustCard}>
            <span className={s.label}>Transport</span>
            <span className={s.value}>TLS 1.2+ · HTTPS/WSS</span>
          </div>
          <div className={s.trustCard}>
            <span className={s.label}>Passwords</span>
            <span className={s.value}>Argon2id</span>
          </div>
          <div className={s.trustCard}>
            <span className={s.label}>Hosting</span>
            <span className={s.value}>EU regions only</span>
          </div>
          <div className={s.trustCard}>
            <span className={s.label}>Sessions</span>
            <span className={s.value}>Signed JWT, rotating</span>
          </div>
        </div>

        {/* ── Body + TOC ───────────────────────── */}
        <div className={s.body}>
          <div className={s.main}>
            {/* Intro card (no number) */}
            <section className={s.section}>
              <div className={s.content}>
                <p>
                  {introParts[0]}
                  <a href="mailto:security@kalit.ai">security@kalit.ai</a>
                  {introParts[1] || "."}
                </p>
              </div>
            </section>

            {sections.map((sec, i) => (
              <section key={sec.id} id={sec.id} className={s.section}>
                <div className={s.sectionHead}>
                  <span className={s.sectionIcon}>
                    <Icon icon={sec.icon} />
                  </span>
                  <div>
                    <div className={s.sectionNumber}>0{i + 1}</div>
                    <h2 className={s.sectionTitle}>{sec.title}</h2>
                  </div>
                </div>
                <div className={s.content}>{sec.body}</div>
              </section>
            ))}

            <section className={s.contactCard}>
              <h3>{c.contactTitle}</h3>
              <p>{c.contactText}</p>
              <p className={s.contactLine}>
                <a href="mailto:security@kalit.ai">security@kalit.ai</a>
              </p>
              <p className={s.contactLine} style={{ fontSize: "0.82rem" }}>
                {c.contactAddress}
              </p>
            </section>
          </div>

          <PolicyToc
            title={pe.standardsEyebrow.split(" · ")[0] || "On this page"}
            items={sections.map((sec) => ({ id: sec.id, label: sec.title }))}
          />
        </div>
      </Container>
    </PageSection>
  )
}
