import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { getServerTranslation } from "@/lib/i18n-server"
import { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { ContactForm } from "./form"
import s from "./contact.module.scss"

export const metadata: Metadata = {
  title: "Contact Us — Kalit AI",
  description: "Get in touch with the Kalit AI team. Questions, partnerships, press, or support — we'd love to hear from you.",
}

export default async function ContactPage() {
  const t = await getServerTranslation()

  const channels = [
    { icon: "hugeicons:mail-01", label: "Email", value: "contact@kalit.ai", href: "mailto:contact@kalit.ai" },
    { icon: "hugeicons:discord", label: "Discord", value: t("contact.joinCommunity"), href: "https://discord.gg/kalit-ai" },
    { icon: "hugeicons:new-twitter", label: "X (Twitter)", value: "@kalit_ai", href: "https://x.com/kalit_ai" },
    { icon: "hugeicons:linkedin-01", label: "LinkedIn", value: "Kalit AI", href: "https://www.linkedin.com/company/kalit-ai" }
  ]

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={t("contact.getInTouch")}
          description={t("contact.getInTouchDesc")}
        />

        <div className={s.layout}>
          <div className={s.formSide}>
            <ContactForm />
          </div>

          <div className={s.infoSide}>
            <div className={s.channels}>
              {channels.map((ch) => (
                <a
                  key={ch.label}
                  href={ch.href}
                  target={ch.href.startsWith("mailto") ? undefined : "_blank"}
                  rel={ch.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                  className={s.channel}
                >
                  <div className={s.channelIcon}>
                    <Icon icon={ch.icon} />
                  </div>
                  <div>
                    <div className={s.channelLabel}>{ch.label}</div>
                    <div className={s.channelValue}>{ch.value}</div>
                  </div>
                </a>
              ))}
            </div>

            <div className={s.address}>
              <h3 className={s.addressTitle}>{t("contact.ourOffice")}</h3>
              <p className={s.addressText}>
                Merkle Tech Labs LTD.<br />
                Northlink Business Centre, Level 2<br />
                Triq Burmarrad, Naxxar, NXR 6345<br />
                Malta
              </p>
            </div>
          </div>
        </div>
      </Container>
    </PageSection>
  )
}
