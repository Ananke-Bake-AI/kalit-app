"use client"

import { Container } from "@/components/container"
import { Logotype } from "@/components/logotype"
import { useTranslation } from "@/stores/i18n"
import Link from "next/link"
import { Socials } from "../socials"
import s from "./footer.module.scss"
import { Newsletter } from "./newsletter"

export const Footer = () => {
  const t = useTranslation()

  const NAVS = [
    {
      title: t("footer.suites"),
      links: [
        { title: "Pentest", href: "/pentest" },
        { title: "Flow", href: "/flow" },
        { title: "Marketing", href: "/marketing" },
        { title: "Project", href: "/project" }
      ]
    },
    {
      title: t("footer.resources"),
      links: [
        { title: t("footer.faq"), href: "/faq" },
        { title: t("footer.support"), href: "/support" },
        { title: t("footer.documentation"), href: "/documentation" },
        { title: "GitHub", href: "/github" }
      ]
    },
    {
      title: t("footer.company"),
      links: [
        { title: t("footer.aboutUs"), href: "/about" },
        { title: t("footer.careers"), href: "/careers" },
        { title: t("footer.contactUs"), href: "/contact-us" },
        { title: t("footer.brandingKit"), href: "/branding-kit" }
      ]
    }
  ]

  return (
    <footer className={s.footer}>
      <Container className={s.container}>
        <div className={s.top}>
          <div className={s.left}>
            <Logotype className={s.logo} />
            <div>
              <Socials />
              <p>© 2026. {t("footer.rights")}</p>
            </div>
          </div>
          <div className={s.nav}>
            {NAVS.map((nav) => (
              <div key={nav.title}>
                <h3>{nav.title}</h3>
                <ul>
                  {nav.links.map((link) => (
                    <li key={link.title}>
                      <Link href={link.href}>{link.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <Newsletter />
        <div className={s.bottom}>
          <Link href="/terms-of-service">{t("footer.terms")}</Link>
          <Link href="/privacy-policy">{t("footer.privacy")}</Link>
          <p>{t("footer.trademarks")}</p>
        </div>
      </Container>
    </footer>
  )
}
