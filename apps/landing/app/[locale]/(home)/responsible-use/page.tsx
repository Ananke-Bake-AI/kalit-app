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
    fullTitle: "Responsible Use Policy - Kalit AI",
    description:
      "Acceptable use of Kalit AI, with a focused section on authorized targets for the Pentest suite. Read before running an active security scan.",
    locale,
    pathname: "/responsible-use"
  })
}

export default function ResponsibleUsePage() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Responsible Use Policy"
          description="What you can and cannot do with Kalit AI — with special rules for Pentest. Last updated: May 13, 2026."
        />

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <p>
            This Responsible Use Policy supplements our{" "}
            <Link href="/terms-of-service">Terms of Service</Link>. It applies to every
            Kalit AI account and every suite (Flow, Pentest, Search, Marketing). The rules
            for Pentest are stricter because the suite performs <strong>active security
            testing</strong> against real systems. Read this page before you run a Pentest
            scan.
          </p>

          <h2>1. Authorized use only — Pentest</h2>
          <p>
            You may <strong>only</strong> use Kalit Pentest against targets where you have
            <strong> explicit, written authorization</strong> to perform active security
            testing. Acceptable authorizations include:
          </p>
          <ul>
            <li>A system that you personally own and operate.</li>
            <li>A system owned by a company that has retained you, with a signed engagement letter or pentest agreement on file.</li>
            <li>A target listed in the explicit scope of a public bug bounty program where you are an enrolled participant.</li>
            <li>A staging or test environment owned by your employer, provided your employer authorizes it.</li>
          </ul>
          <p>
            Before your first Pentest scan we ask you to confirm authorization. False
            attestations are a material breach of our Terms and may be reported to law
            enforcement.
          </p>

          <h2>2. Prohibited targets — Pentest</h2>
          <p>You may not run Kalit Pentest against any of the following:</p>
          <ul>
            <li>Systems you do not own or are not contracted to test.</li>
            <li>Government, military, critical infrastructure, healthcare or financial systems, unless covered by a formal engagement.</li>
            <li>Sites and services belonging to schools, charities or minors, unless under a formal engagement.</li>
            <li>Bug bounty targets outside the published scope of an enrolled program.</li>
            <li>Third-party hosted services (e.g. shared SaaS) where your activity could affect other tenants. Scans must be confined to instances or environments you control.</li>
            <li>Any system in a country where you are subject to active sanctions or export controls.</li>
          </ul>
          <p>
            We monitor scan targets for repeated abuse signals (e.g. spikes against high-profile
            domains, dictionary attacks against unrelated targets). Suspected misuse will
            trigger an immediate suspension pending review.
          </p>

          <h2>3. Evidence handling</h2>
          <p>
            Pentest findings often include sensitive material — credentials discovered in
            misconfigured files, internal URLs, customer data exposed through IDOR, etc. You
            agree to:
          </p>
          <ul>
            <li>Treat findings as confidential to the target's owner.</li>
            <li>Not exfiltrate more data than necessary to demonstrate a vulnerability.</li>
            <li>Delete or sanitize sensitive evidence after remediation.</li>
            <li>Share Pentest reports only with people authorized by the target owner to receive them.</li>
          </ul>

          <h2>4. General acceptable use — all suites</h2>
          <p>You agree not to use Kalit AI to:</p>
          <ul>
            <li>Generate or distribute illegal content, including CSAM, content inciting violence, or content that violates copyright or trademark rights.</li>
            <li>Build phishing pages, malware, spyware, ransomware or other software designed to deceive, harm or compromise users.</li>
            <li>Build, train or fine-tune competing AI systems on Kalit AI outputs in bulk.</li>
            <li>Scrape, harvest or reverse-engineer Kalit AI itself.</li>
            <li>Send unsolicited bulk communications (spam) from accounts created with Marketing or Flow.</li>
            <li>Impersonate any person or organization, including Kalit AI or its staff.</li>
            <li>Circumvent rate limits, usage quotas or paywalls.</li>
          </ul>

          <h2>5. AI output — your responsibility</h2>
          <p>
            Kalit AI produces code, content and security findings using language models.
            Outputs can be incorrect, biased, or insecure. You are responsible for reviewing
            output before:
          </p>
          <ul>
            <li>Deploying generated code to production.</li>
            <li>Publishing marketing content under your brand.</li>
            <li>Acting on a Pentest finding (e.g. reporting it to a third party).</li>
          </ul>
          <p>
            We continuously work to improve agent accuracy, but you remain the human-in-the-loop.
          </p>

          <h2>6. Enforcement</h2>
          <p>
            Violations of this policy may result in:
          </p>
          <ul>
            <li>A warning and forced cool-down on scan or generation activity.</li>
            <li>Suspension or termination of your account without refund.</li>
            <li>Forfeiture of credits and account balance.</li>
            <li>Notification of relevant law enforcement, hosting providers or affected third parties.</li>
          </ul>
          <p>
            We may publish a transparency note about a serious enforcement action without
            naming individuals.
          </p>

          <h2>7. Reporting abuse</h2>
          <p>
            If you believe a Kalit AI user is targeting your systems without authorization, or
            otherwise violating this policy, email{" "}
            <a href="mailto:abuse@kalit.ai">abuse@kalit.ai</a> with timestamps, source IPs and
            any logs you can share. We aim to acknowledge abuse reports within 1 business day
            and act on confirmed reports immediately.
          </p>

          <h2>8. Updates</h2>
          <p>
            We may update this policy. Material changes will be announced in the changelog and
            by email to active customers at least 14 days before they take effect.
          </p>

          <h2>Contact</h2>
          <p>
            <strong>abuse@kalit.ai</strong> — abuse and unauthorized targeting reports.
            <br />
            <strong>security@kalit.ai</strong> — vulnerability disclosure.
            <br />
            <strong>contact@kalit.ai</strong> — anything else.
          </p>
        </article>
      </Container>
    </PageSection>
  )
}
