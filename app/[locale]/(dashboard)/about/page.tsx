import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { Logo } from "@/components/logo"
import { Metadata } from "next"
import Image from "next/image"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { getServerTranslation } from "@/lib/i18n-server"
import s from "./about.module.scss"

export const metadata: Metadata = {
  title: "About Us — Kalit AI",
  description:
    "Meet the team behind Kalit AI. Experienced engineers and entrepreneurs building the AI execution platform for startups and digital teams.",
}

const FOUNDERS_DATA = [
  {
    name: "Frederick Marinho",
    roleTKey: "about.cofounderCeo",
    bioTKey: "about.frederickBio",
    photo: "/img/founders/frederick.jpeg",
    companies: ["Helios Blockchain", "Merkle Tech Capital", "GraphLinq", "Kryxivia"],
    linkedin: "https://www.linkedin.com/in/frederick-marinho/"
  },
  {
    name: "Jeremy Guyet",
    roleTKey: "about.cofounderCto",
    bioTKey: "about.jeremyBio",
    photo: "/img/founders/jeremy.jpg",
    companies: ["AXA", "Canal+", "Checkdot", "Kryxivia", "Ambient IT"],
    linkedin: "https://www.linkedin.com/in/jeremy-guyet/"
  },
  {
    name: "Nicolas Martins",
    roleTKey: "about.cofounderLead",
    bioTKey: "about.nicolasBio",
    photo: "/img/founders/nicolas.jpg",
    companies: ["Cityscoot", "RATP", "Telys", "Groupe AB"],
    linkedin: "https://www.linkedin.com/in/nicolas-martins/"
  }
]

const VALUES_DATA = [
  { icon: "hugeicons:rocket-01", titleKey: "about.value1Title", descKey: "about.value1Desc" },
  { icon: "hugeicons:cpu", titleKey: "about.value2Title", descKey: "about.value2Desc" },
  { icon: "hugeicons:shield-01", titleKey: "about.value3Title", descKey: "about.value3Desc" },
  { icon: "hugeicons:chart-breakout-circle", titleKey: "about.value4Title", descKey: "about.value4Desc" }
]

export default async function AboutPage() {
  const { t } = await getServerTranslation()

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={t("about.title")}
          description={t("about.description")}
        />

        {/* ── Founders ─────────────────────────────── */}

        <div className={s.foundersGrid}>
          {FOUNDERS_DATA.map((founder) => (
            <div key={founder.name} className={s.founderCard}>
              <div className={s.photoWrap}>
                <Image
                  src={founder.photo}
                  alt={founder.name}
                  width={400}
                  height={400}
                  className={s.photo}
                  quality={90}
                />
                <div className={s.photoOverlay} />
              </div>
              <div className={s.founderBody}>
                <div className={s.founderTop}>
                  <h3 className={s.founderName}>{founder.name}</h3>
                  <span className={s.founderRole}>{t(founder.roleTKey)}</span>
                </div>
                <p className={s.founderBio}>{t(founder.bioTKey)}</p>
                <div className={s.companies}>
                  {founder.companies.map((c) => (
                    <span key={c} className={s.company}>{c}</span>
                  ))}
                </div>
                <a
                  href={founder.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.linkedinLink}
                >
                  <Icon icon="hugeicons:linkedin-01" />
                  LinkedIn
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* ── Values ──────────────────────────────── */}

        <h2 className={s.sectionTitle}>{t("about.valuesTitle")}</h2>
        <div className={s.valuesGrid}>
          {VALUES_DATA.map((value) => (
            <div key={value.titleKey} className={s.valueCard}>
              <div className={s.valueIcon}>
                <Icon icon={value.icon} />
              </div>
              <h3 className={s.valueTitle}>{t(value.titleKey)}</h3>
              <p className={s.valueDesc}>{t(value.descKey)}</p>
            </div>
          ))}
        </div>

        {/* ── Company ────────────────────────────── */}

        <div className={s.companySection}>
          <div className={s.companyContent}>
            <div className={s.companyLogo}>
              <Logo id="kalit" />
            </div>
            <div>
              <h2 className={s.companyTitle}>Merkle Tech Labs LTD.</h2>
              <p className={s.companySubtitle}>{t("about.companySubtitle")}</p>
            </div>
          </div>

          <div className={s.companyGrid}>
            <div className={s.companyItem}>
              <span className={s.companyLabel}>{t("about.registration")}</span>
              <span className={s.companyValue}>C 107851</span>
            </div>
            <div className={s.companyItem}>
              <span className={s.companyLabel}>{t("about.incorporated")}</span>
              <span className={s.companyValue}>{t("about.incorporatedDate")}</span>
            </div>
            <div className={s.companyItem}>
              <span className={s.companyLabel}>{t("about.jurisdiction")}</span>
              <span className={s.companyValue}>Malta</span>
            </div>
            <div className={s.companyItem}>
              <span className={s.companyLabel}>{t("about.registeredOffice")}</span>
              <span className={s.companyValue}>
                Northlink Business Centre, Level 2<br />
                Triq Burmarrad, Naxxar, NXR 6345<br />
                Malta
              </span>
            </div>
          </div>

          <div className={s.companyContact}>
            <a href="mailto:contact@kalit.ai" className={s.contactLink}>
              <Icon icon="hugeicons:mail-01" />
              contact@kalit.ai
            </a>
            <a href="https://x.com/kalit_ai" target="_blank" rel="noopener noreferrer" className={s.contactLink}>
              <Icon icon="hugeicons:new-twitter" />
              @kalit_ai
            </a>
            <a href="https://www.linkedin.com/company/kalit-ai" target="_blank" rel="noopener noreferrer" className={s.contactLink}>
              <Icon icon="hugeicons:linkedin-01" />
              LinkedIn
            </a>
            <a href="https://discord.gg/kalit-ai" target="_blank" rel="noopener noreferrer" className={s.contactLink}>
              <Icon icon="hugeicons:discord" />
              Discord
            </a>
          </div>
        </div>
      </Container>
    </PageSection>
  )
}
