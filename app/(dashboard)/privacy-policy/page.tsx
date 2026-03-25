import { Container } from "@/components/container"
import clsx from "clsx"
import { Metadata } from "next"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import legal from "@/components/legal-document/legal-document.module.scss"

export const metadata: Metadata = {
  title: "Privacy Policy — Kalit AI",
  description: "Privacy Policy for the Kalit AI platform.",
}

export default function PrivacyPolicyPage() {
  return (
    <PageSection>
      <Container>
        <PageHeader title="Privacy Policy" description="Last updated: March 19, 2026" />

        <article className={clsx(legal.surface, legal.narrow, legal.prose)}>
          <p>
            At Kalit AI, we take your privacy seriously. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you use our platform and
            services. Please read this policy carefully. By using the Service, you consent to the
            practices described herein.
          </p>

          <h2>1. Data We Collect</h2>

          <h3>Account Information</h3>
          <p>
            When you create an account, we collect your name, email address, and password. If you
            sign up through a third-party provider (e.g., Google, GitHub), we receive your profile
            information from that provider.
          </p>

          <h3>Usage Data</h3>
          <p>
            We automatically collect information about how you interact with the Service, including:
          </p>
          <ul>
            <li>Pages visited, features used, and actions taken within the platform.</li>
            <li>Device information (browser type, operating system, screen resolution).</li>
            <li>IP address and approximate geographic location.</li>
            <li>Timestamps and session duration.</li>
          </ul>

          <h3>Payment Information</h3>
          <p>
            When you subscribe to a paid plan, payment processing is handled by Stripe. We do not
            store your full credit card number on our servers. Stripe may collect your card details,
            billing address, and other payment-related information in accordance with their own
            privacy policy.
          </p>

          <h3>Content You Provide</h3>
          <p>
            We collect and store the data, files, prompts, and other content you upload or input
            into the Service in order to provide our AI-powered features.
          </p>

          <h2>2. How We Use Your Data</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service.</li>
            <li>Process transactions and manage your subscription.</li>
            <li>Send you service-related communications (e.g., account verification, billing).</li>
            <li>Respond to your support requests and inquiries.</li>
            <li>
              Analyze usage patterns to improve our features and user experience.
            </li>
            <li>Detect, prevent, and address fraud, abuse, or security issues.</li>
            <li>
              Comply with legal obligations.
            </li>
          </ul>
          <p>
            We do not use your content to train our AI models unless you explicitly opt in to such
            programs.
          </p>

          <h2>3. Data Sharing</h2>
          <p>
            We do not sell your personal data. We may share your information in the following
            limited circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> We share data
              with trusted third-party providers who assist us in operating the Service (e.g.,
              Stripe for payments, cloud hosting providers, analytics tools). These providers are
              contractually obligated to protect your data.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may
              disclose your information if required by law, regulation, or legal process, or if we
              believe disclosure is necessary to protect our rights, your safety, or the safety of
              others.
            </li>
            <li>
              <strong>Business Transfers:</strong> In the event
              of a merger, acquisition, or sale of assets, your data may be transferred as part of
              the transaction. We will notify you of any such change.
            </li>
          </ul>

          <h2>4. Cookies</h2>
          <p>
            We use cookies and similar tracking technologies to enhance your experience:
          </p>
          <ul>
            <li>
              <strong>Essential Cookies:</strong> Required for
              the Service to function (e.g., authentication, session management).
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us
              understand how the Service is used so we can improve it. We use privacy-focused
              analytics tools.
            </li>
            <li>
              <strong>Preference Cookies:</strong> Remember your
              settings and preferences across sessions.
            </li>
          </ul>
          <p>
            You can manage cookie preferences through your browser settings. Disabling essential
            cookies may affect the functionality of the Service.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to
            provide you the Service. If you delete your account, we will delete or anonymize your
            personal data within 30 days, except where we are required to retain it for legal,
            accounting, or regulatory purposes.
          </p>
          <p>
            Usage and analytics data may be retained in aggregated, anonymized form indefinitely for
            statistical purposes.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            Under applicable data protection laws, including the GDPR, you have the following
            rights:
          </p>
          <ul>
            <li>
              <strong>Right of Access:</strong> You can request a
              copy of the personal data we hold about you.
            </li>
            <li>
              <strong>Right to Rectification:</strong> You can
              request correction of inaccurate or incomplete data.
            </li>
            <li>
              <strong>Right to Erasure:</strong> You can request
              deletion of your personal data, subject to legal retention requirements.
            </li>
            <li>
              <strong>Right to Data Portability:</strong> You can
              request your data in a structured, commonly used, machine-readable format.
            </li>
            <li>
              <strong>Right to Restrict Processing:</strong> You
              can request that we limit how we use your data in certain circumstances.
            </li>
            <li>
              <strong>Right to Object:</strong> You can object to
              our processing of your data for certain purposes, including direct marketing.
            </li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{" "}
            <a href="mailto:contact@kalit.ai">
              contact@kalit.ai
            </a>
            . We will respond to your request within 30 days.
          </p>

          <h2>7. Data Security</h2>
          <p>
            We implement industry-standard technical and organizational measures to protect your
            data, including encryption in transit (TLS) and at rest, access controls, and regular
            security audits. However, no method of transmission over the Internet or electronic
            storage is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for use by anyone under the age of 16. We do not knowingly
            collect personal data from children under 16. If we become aware that we have collected
            data from a child under 16, we will take steps to delete that information promptly. If
            you believe a child has provided us with personal data, please contact us at
            contact@kalit.ai.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your own. When we
            transfer data outside the European Economic Area (EEA), we ensure appropriate safeguards
            are in place, such as Standard Contractual Clauses approved by the European Commission.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we
            will notify you by email or through a prominent notice on the Service at least 30 days
            before the changes take effect. Your continued use of the Service after the effective
            date constitutes your acceptance of the updated policy.
          </p>

          <h2>11. Contact</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or our data practices,
            please contact us at:
          </p>
          <p>
            <strong>Kalit AI</strong>
            <br />
            Email:{" "}
            <a href="mailto:contact@kalit.ai">
              contact@kalit.ai
            </a>
          </p>
        </article>
      </Container>
    </PageSection>
  )
}
