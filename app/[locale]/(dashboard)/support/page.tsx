import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import s from "./support.module.scss"

export const metadata: Metadata = {
  title: "Support — Kalit AI",
  description: "Get help and support for the Kalit AI platform.",
}

export default function SupportPage() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Support"
          description="We are here to help. Choose the support channel that works best for you."
        />

        <div className={s.grid}>
          <div className={s.card}>
            <h2 className={s.cardTitle}>Email Support</h2>
            <p className={s.cardText}>
              Reach our support team directly by email. We aim to respond within 24 hours on
              business days. Pro and Team plan users receive priority support.
            </p>
            <a href="mailto:contact@kalit.ai" className={s.cardLink}>
              contact@kalit.ai
            </a>
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>FAQ</h2>
            <p className={s.cardText}>
              Browse our frequently asked questions for quick answers to common topics including
              pricing, features, security, and account management.
            </p>
            <Link href="/faq" className={s.cardLink}>
              View FAQ
            </Link>
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>Documentation</h2>
            <p className={s.cardText}>
              Explore our documentation for detailed guides on getting started, configuring suites,
              using the API, and managing your account.
            </p>
            <Link href="/docs" className={s.cardLink}>
              Browse Docs
            </Link>
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>Discord Community</h2>
            <p className={s.cardText}>
              Join our Discord server to connect with other Kalit AI users, share tips, get
              community support, and stay updated on new features.
            </p>
            <Link href="https://discord.gg/kalit-ai" className={s.cardLink}>
              Join Discord
            </Link>
          </div>
        </div>
      </Container>
    </PageSection>
  )
}
