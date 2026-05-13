import { Container } from "@/components/container"
import clsx from "clsx"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import legal from "@/components/legal-document/legal-document.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Security - Kalit AI",
    description:
      "How Kalit AI protects your data: encryption in transit and at rest, EU-region processing, OAuth providers, subprocessor list, vulnerability disclosure and incident response.",
    locale,
    pathname: "/security"
  })
}

export default function SecurityPage() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Security at Kalit AI"
          description="Our security posture, in plain language. Last updated: May 13, 2026."
        />

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <p>
            Kalit AI is operated by <strong>Merkle Tech Labs LTD.</strong> (Malta, company
            registration C 107851). This page describes how we protect customer data, who
            we share it with, and how to report a vulnerability. If you need a signed copy
            for procurement, email{" "}
            <a href="mailto:security@kalit.ai">security@kalit.ai</a>.
          </p>

          <h2>Data encryption</h2>
          <ul>
            <li>
              <strong>In transit:</strong> all customer traffic is encrypted over TLS 1.2+ (HTTPS/WSS).
              Internal service-to-service traffic between the broker, taskforce and pentest
              engines is authenticated with short-lived JWTs.
            </li>
            <li>
              <strong>At rest:</strong> the primary PostgreSQL database is encrypted at rest by our
              cloud provider (Neon, EU region). Object storage (project artifacts, generated
              assets) is encrypted server-side with provider-managed keys.
            </li>
            <li>
              <strong>Secrets:</strong> API keys you supply (Stripe, custom LLM keys, deploy
              credentials) are encrypted with envelope encryption before being written to the
              database. Plaintext exists only in memory during a job run.
            </li>
          </ul>

          <h2>Authentication</h2>
          <p>
            Sign in with email + password (Argon2id hashes), or with Google, GitHub, Discord,
            LinkedIn or Facebook OAuth. Sessions use signed JWTs with rotating refresh tokens.
            Account recovery requires email-link verification.
          </p>

          <h2>Data residency and processing</h2>
          <p>
            Customer data is processed and stored in the European Union. We do not currently
            replicate primary datasets outside the EU. LLM calls made on your behalf may transit
            providers based in the United States (see subprocessors). If you need EU-only LLM
            routing for a deal, contact us.
          </p>

          <h2>Subprocessors</h2>
          <p>
            Kalit AI uses the following third-party services to deliver the platform:
          </p>
          <ul>
            <li><strong>Anthropic</strong> — primary LLM (Claude) for code generation, pentest agents and orchestration.</li>
            <li><strong>OpenAI</strong> — fallback LLM (Codex) for specific tasks.</li>
            <li><strong>Neon</strong> — managed PostgreSQL (EU region).</li>
            <li><strong>MongoDB Atlas</strong> — pentest scan data and findings storage (EU region).</li>
            <li><strong>Stripe</strong> — payment processing and subscription billing.</li>
            <li><strong>Resend</strong> — transactional email (verification, password reset, notifications).</li>
            <li><strong>Vercel</strong> — landing site + dashboard hosting; one of several deploy targets for generated apps.</li>
            <li><strong>Cloudflare</strong> — DNS and CDN for kalit.ai and custom domains.</li>
            <li><strong>Porkbun</strong> — domain registration (when you buy a domain through Flow).</li>
            <li><strong>Google Analytics 4</strong> — anonymous traffic analytics on marketing pages.</li>
          </ul>
          <p>
            A signed subprocessor list and DPA is available on request for paying customers.
          </p>

          <h2>Access control</h2>
          <ul>
            <li>Least-privilege access to production systems. All admin access is logged.</li>
            <li>Production deploys go through signed pipelines and reviewed pull requests.</li>
            <li>Employee laptops use full-disk encryption and managed configuration.</li>
            <li>No customer data is copied to personal machines.</li>
          </ul>

          <h2>Pentest suite</h2>
          <p>
            Kalit Pentest can perform active security testing (SQL injection, XSS, SSRF,
            authentication bypass, and more). It must <strong>only</strong> be used against
            targets you own or are explicitly authorized to test. Misuse can lead to legal
            liability and immediate account termination. See our{" "}
            <Link href="/responsible-use">Responsible Use Policy</Link> before running a scan.
          </p>
          <p>
            Pentest scans run from dedicated egress IPs. On request, we can provide the source
            IP range so your team can scope monitoring and WAF rules during a scan window.
          </p>

          <h2>Vulnerability disclosure</h2>
          <p>
            If you believe you've found a security vulnerability in Kalit AI, please email{" "}
            <a href="mailto:security@kalit.ai">security@kalit.ai</a> with a description, a
            proof of concept and your suggested severity. We commit to:
          </p>
          <ul>
            <li>Acknowledging your report within 3 business days.</li>
            <li>Providing a triage decision within 10 business days.</li>
            <li>Coordinating public disclosure once a fix is shipped.</li>
            <li>Crediting you in the changelog if you wish.</li>
          </ul>
          <p>
            We don't currently operate a paid bug bounty program. We do reward serious,
            in-scope reports with credits, swag and a public thank-you.
          </p>

          <h2>Incident response</h2>
          <p>
            We maintain an incident-response runbook covering detection, containment,
            customer notification and post-mortem. If a security incident materially affects
            your data, we will notify affected customers within 72 hours by email and post a
            status update at <a href="https://status.kalit.ai">status.kalit.ai</a>.
          </p>

          <h2>Compliance roadmap</h2>
          <p>
            Kalit AI is not yet SOC 2 or ISO 27001 certified. We follow controls aligned with
            these standards and intend to pursue formal certification in 2026. Compliance
            artifacts available today: subprocessor list, DPA, security questionnaire (on
            request).
          </p>

          <h2>Contact</h2>
          <p>
            For security questions, vulnerability reports, or procurement security reviews:
          </p>
          <p>
            <strong>security@kalit.ai</strong>
            <br />
            Merkle Tech Labs LTD., Northlink Business Centre, Level 2, Triq Burmarrad,
            Naxxar, NXR 6345, Malta
          </p>
        </article>
      </Container>
    </PageSection>
  )
}
