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
  const c = (await getPageStrings(locale)).responsibleUse
  return MetadataSeo({
    fullTitle: c.metaTitle,
    description: c.metaDescription,
    locale,
    pathname: "/responsible-use"
  })
}

interface Section {
  id: string
  icon: string
  title: string
  body: React.ReactNode
}

export default async function ResponsibleUsePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).responsibleUse

  const reportParts = c.reportText.split("abuse@kalit.ai")
  const introParts = c.intro.split("Terms of Service")

  const sections: Section[] = [
    {
      id: "auth",
      icon: "hugeicons:checkmark-circle-02",
      title: c.authTitle,
      body: (
        <>
          <p>{c.authIntro}</p>
          <ul>
            {c.authBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className={`${s.callout} ${s.danger}`}>
            <strong>Authorization required before first scan.</strong>
            <p>{c.authConfirm}</p>
          </div>
        </>
      )
    },
    {
      id: "prohibited",
      icon: "hugeicons:cancel-circle",
      title: c.prohibitedTitle,
      body: (
        <>
          <p>{c.prohibitedIntro}</p>
          <ul>
            {c.prohibitedBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className={s.callout}>
            <p>{c.prohibitedNote}</p>
          </div>
        </>
      )
    },
    {
      id: "evidence",
      icon: "hugeicons:folder-locked",
      title: c.evidenceTitle,
      body: (
        <>
          <p>{c.evidenceIntro}</p>
          <ul>
            {c.evidenceBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </>
      )
    },
    {
      id: "general",
      icon: "hugeicons:legal-document-01",
      title: c.generalTitle,
      body: (
        <>
          <p>{c.generalIntro}</p>
          <ul>
            {c.generalBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </>
      )
    },
    {
      id: "output",
      icon: "hugeicons:ai-brain-03",
      title: c.outputTitle,
      body: (
        <>
          <p>{c.outputIntro}</p>
          <ul>
            {c.outputBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p>{c.outputNote}</p>
        </>
      )
    },
    {
      id: "enforcement",
      icon: "hugeicons:gavel",
      title: c.enforcementTitle,
      body: (
        <>
          <p>{c.enforcementIntro}</p>
          <ul>
            {c.enforcementBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p>{c.enforcementNote}</p>
        </>
      )
    },
    {
      id: "report",
      icon: "hugeicons:megaphone-01",
      title: c.reportTitle,
      body: (
        <p>
          {reportParts[0]}
          <a href="mailto:abuse@kalit.ai">abuse@kalit.ai</a>
          {reportParts[1] || ""}
        </p>
      )
    },
    {
      id: "updates",
      icon: "hugeicons:refresh",
      title: c.updatesTitle,
      body: <p>{c.updatesText}</p>
    }
  ]

  return (
    <PageSection>
      <Container>
        <div className={s.head}>
          <span className={s.eyebrow}>
            <Icon icon="hugeicons:shield-user" /> Responsible Use
          </span>
          <h1 className={s.title}>{c.title}</h1>
          <p className={s.lede}>{c.subtitle}</p>
          <div className={s.metaRow}>
            <span>
              <Icon icon="hugeicons:mail-01" />
              <a href="mailto:abuse@kalit.ai">abuse@kalit.ai</a>
            </span>
            <span>
              <Icon icon="hugeicons:mail-01" />
              <a href="mailto:security@kalit.ai">security@kalit.ai</a>
            </span>
            <span>
              <Icon icon="hugeicons:legal-document-01" />
              <Link href="/terms-of-service">Terms of Service</Link>
            </span>
          </div>
        </div>

        <div className={s.body}>
          <div className={s.main}>
            <section className={s.section}>
              <div className={s.content}>
                <p>
                  {introParts[0]}
                  <Link href="/terms-of-service">Terms of Service</Link>
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
              <p className={s.contactLine}>
                <strong>abuse@kalit.ai</strong> — abuse and unauthorized targeting reports.
              </p>
              <p className={s.contactLine}>
                <strong>security@kalit.ai</strong> — vulnerability disclosure.
              </p>
              <p className={s.contactLine}>
                <strong>contact@kalit.ai</strong> — anything else.
              </p>
            </section>
          </div>

          <PolicyToc
            title="On this page"
            items={sections.map((sec) => ({ id: sec.id, label: sec.title }))}
          />
        </div>
      </Container>
    </PageSection>
  )
}
