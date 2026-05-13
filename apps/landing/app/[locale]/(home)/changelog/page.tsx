import { Container } from "@/components/container"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import s from "./changelog.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Changelog - Kalit AI",
    description:
      "What's new at Kalit AI. Releases across Flow, Pentest, Search and the dashboard, grouped by week.",
    locale,
    pathname: "/changelog"
  })
}

type Tag = "feature" | "fix" | "chore"
interface Entry {
  date: string
  title: string
  tag: Tag
  bullets: string[]
}

const ENTRIES: Entry[] = [
  {
    date: "May 12, 2026",
    title: "Discord community goes public",
    tag: "feature",
    bullets: [
      "Floating Discord launcher across the marketing site and dashboard.",
      "New permanent invite link, fresh #showcase and #build-help channels.",
      "Discord OAuth available on signup and login."
    ]
  },
  {
    date: "May 9, 2026",
    title: "Analytics rebuilt around GA4",
    tag: "chore",
    bullets: [
      "GA4 page_view events now fire on SPA route changes — accurate funnels across the app.",
      "Ads conversion tracking running side-by-side with GA4."
    ]
  },
  {
    date: "May 5, 2026",
    title: "Studio: faster session switching and live state",
    tag: "feature",
    bullets: [
      "Per-session message cache — switching between chats is instant.",
      "WebSocket is now the single state writer; SSE fallback retired.",
      "Thinking dots and tool indicators show on reload and direct URLs, not just live runs.",
      "Client-side heartbeat detects dead sockets in 30 seconds (was minutes)."
    ]
  },
  {
    date: "May 1, 2026",
    title: "Email verification gate + tighter trial budgets",
    tag: "feature",
    bullets: [
      "New accounts must verify email before consuming credits.",
      "Trial credit budget recalibrated based on Q1 usage data — fewer abandoned trials, cleaner activation."
    ]
  },
  {
    date: "April 28, 2026",
    title: "Pricing v2: clearer plans, repriced credit packs",
    tag: "feature",
    bullets: [
      "Sub plans tightened on margin — same outcome budget, cleaner credit math.",
      "Three credit packs (25 / 100 / 400) available as one-time top-ups.",
      "Out-of-credits modal now suggests the right pack size based on your run history."
    ]
  },
  {
    date: "April 23, 2026",
    title: "Broker autodeploy guardrails",
    tag: "fix",
    bullets: [
      "Empty-project window no longer triggers a false-positive auto-deploy.",
      "flow_projects.status now correctly flips processing → completed.",
      "find-assets writes partial state on every flush — crashed research runs are recoverable."
    ]
  },
  {
    date: "April 17, 2026",
    title: "Sprint, patch and hotfix widgets",
    tag: "feature",
    bullets: [
      "New widget types in Studio for sprint planning, patches and hotfix runs.",
      "Inline status, change log, and one-click rerun from each widget."
    ]
  },
  {
    date: "April 10, 2026",
    title: "Conversion surfaces, batch 1",
    tag: "feature",
    bullets: [
      "Trial banner, header credit pill, dashboard upgrade pitch and out-of-credits modal.",
      "Inline checkout result card replaces noisy toasts.",
      "Plan upgrades and credit top-ups are now visually distinct."
    ]
  },
  {
    date: "April 3, 2026",
    title: "Pentest Sprint 6: WAF bypass and lessons-learned loops",
    tag: "feature",
    bullets: [
      "WAF engine fingerprints 12+ products (Cloudflare, AWS WAF, Akamai, Imperva, …).",
      "Payload mutation engine for URL, Base64, HTML-entity and null-byte bypasses.",
      "Inter-agent intelligence refresh: specialist agents share findings during a single scan.",
      "SARIF 2.1.0 export for GitHub Advanced Security integration."
    ]
  },
  {
    date: "March 27, 2026",
    title: "Public portfolio at /discover",
    tag: "feature",
    bullets: [
      "Real projects shipped with Kalit Flow now appear in a public gallery.",
      "Per-user public profile at /u/[username] — show what you've built."
    ]
  }
]

export default function ChangelogPage() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Changelog"
          description="What we ship, when we ship it. Newest first."
        />

        <div className={s.list}>
          {ENTRIES.map((entry, i) => (
            <article key={i} className={s.entry}>
              <div className={s.head}>
                <h2 className={s.title}>{entry.title}</h2>
                <div className={s.meta}>
                  <span className={`${s.tag} ${s[entry.tag]}`}>{entry.tag}</span>
                  <time>{entry.date}</time>
                </div>
              </div>
              <ul className={s.bullets}>
                {entry.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </PageSection>
  )
}
