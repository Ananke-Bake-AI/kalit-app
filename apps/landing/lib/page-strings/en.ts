/**
 * Source-of-truth EN strings for the marketing pages I added during the
 * pre-launch sprint (pricing, security, responsible-use, changelog header,
 * compare, alternatives, pentest extras, blog chrome).
 *
 * Other locales live in `./<locale>.json` and are AI-translated from this file
 * by `scripts/translate-page-strings.ts`. The runtime resolver merges per-locale
 * overrides on top of EN, so a missing key falls back to English without
 * blowing up the page.
 *
 * If you change a string here, re-run the translator before shipping.
 */

export const EN_PAGE_STRINGS = {
  // ─── Pricing page ────────────────────────────────────────
  pricing: {
    metaTitle: "Pricing - Kalit AI",
    metaDescription:
      "Simple, transparent pricing for the Kalit AI software factory. Free plan, paid tiers for solo builders, agencies and teams. Pentest and Search included on Enterprise.",
    title: "Simple pricing. One AI software factory.",
    description: "Free to try. Paid plans scale by credits and seats. Pentest and Search included on Enterprise.",
    intervalMonth: "/ month",
    creditsLabel: "credits",
    monthLabel: "month",
    popularBadge: "Most chosen",
    packsTitle: "Top up with credit packs",
    packsNote: "One-time packs sit on top of your subscription. Useful for a busy launch week or a single Pentest scan.",
    oneTimeLabel: "one-time",
    faqTitle: "Pricing FAQ",
    planOutcomes: {
      free: "Try Kalit Flow with 3 generations. No card required.",
      starter: "Ship one polished landing site or small MVP per month.",
      pro: "Build and iterate a full product, or run agency client work.",
      enterprise: "Run Flow + Pentest + Search with unlimited seats.",
      custom: "Custom seat counts, agency tooling, volume pricing — built around your team."
    },
    planCtas: {
      free: "Start free",
      starter: "Start Starter",
      pro: "Start Pro",
      enterprise: "Start Enterprise",
      custom: "Talk to us"
    },
    customPlanName: "Custom",
    customPriceLabel: "Custom",
    customFeatures: [
      "Custom seat counts",
      "Agency / reseller program",
      "Volume credit pricing",
      "Dedicated success engineer",
      "Custom onboarding & training",
      "SLA & priority support"
    ],
    faqs: [
      {
        q: "What is one credit?",
        a: "Credits are the underlying usage unit. As a rough guide: ~1 credit per page generation in Flow, ~10–15 credits for an MVP build run, ~5 credits per Pentest scan. Exact costs depend on project size and the specialist agents involved. You'll always see the credit cost before a run kicks off."
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel from the dashboard, no questions asked. Your plan stays active until the end of the current billing period, then drops to Free."
      },
      {
        q: "Do unused credits roll over?",
        a: "Monthly subscription credits don't roll over — they reset on each renewal. One-time credit packs you purchase on top of a subscription stay on your account until used."
      },
      {
        q: "Is Pentest available on Pro?",
        a: "Pentest is included on Enterprise. We're rolling it out to Pro on a beta basis — join the Pentest waitlist from your dashboard or contact us for early access."
      },
      {
        q: "Do you offer agency or volume pricing?",
        a: "Yes. If you ship client work, run more than 10 seats, or need a tailored credit allocation, contact us — we have an agency partner plan."
      },
      {
        q: "What about education or non-profit discounts?",
        a: "We offer discounted Pro plans for students, educators and registered non-profits. Email contact@kalit.ai from your institutional address."
      },
      {
        q: "Where is my data stored?",
        a: "Kalit AI is operated by Merkle Tech Labs LTD. (Malta). Data is processed in EU regions. See our Privacy Policy and Security pages for the full picture, including subprocessors and encryption."
      },
      {
        q: "Can I run Pentest on any site?",
        a: "No. Pentest is only for targets you own or are explicitly authorized to test. See our Responsible Use page before running a scan."
      }
    ]
  },

  // ─── Security page ───────────────────────────────────────
  security: {
    metaTitle: "Security - Kalit AI",
    metaDescription:
      "How Kalit AI protects your data: encryption in transit and at rest, EU-region processing, OAuth providers, subprocessor list, vulnerability disclosure and incident response.",
    title: "Security at Kalit AI",
    subtitle: "Our security posture, in plain language. Last updated: May 13, 2026.",
    intro:
      "Kalit AI is operated by Merkle Tech Labs LTD. (Malta, company registration C 107851). This page describes how we protect customer data, who we share it with, and how to report a vulnerability. If you need a signed copy for procurement, email security@kalit.ai.",
    encryptionTitle: "Data encryption",
    encryptionInTransit:
      "In transit: all customer traffic is encrypted over TLS 1.2+ (HTTPS/WSS). Internal service-to-service traffic between the broker, taskforce and pentest engines is authenticated with short-lived JWTs.",
    encryptionAtRest:
      "At rest: the primary PostgreSQL database is encrypted at rest by our cloud provider (Neon, EU region). Object storage (project artifacts, generated assets) is encrypted server-side with provider-managed keys.",
    encryptionSecrets:
      "Secrets: API keys you supply (Stripe, custom LLM keys, deploy credentials) are encrypted with envelope encryption before being written to the database. Plaintext exists only in memory during a job run.",
    authTitle: "Authentication",
    authText:
      "Sign in with email + password (Argon2id hashes), or with Google, GitHub, Discord, LinkedIn or Facebook OAuth. Sessions use signed JWTs with rotating refresh tokens. Account recovery requires email-link verification.",
    residencyTitle: "Data residency and processing",
    residencyText:
      "Customer data is processed and stored in the European Union. We do not currently replicate primary datasets outside the EU. LLM calls made on your behalf may transit providers based in the United States (see subprocessors). If you need EU-only LLM routing for a deal, contact us.",
    subprocessorsTitle: "Subprocessors",
    subprocessorsIntro: "Kalit AI uses the following third-party services to deliver the platform:",
    subprocessorsList: [
      "Anthropic — primary LLM (Claude) for code generation, pentest agents and orchestration.",
      "OpenAI — fallback LLM (Codex) for specific tasks.",
      "Neon — managed PostgreSQL (EU region).",
      "MongoDB Atlas — pentest scan data and findings storage (EU region).",
      "Stripe — payment processing and subscription billing.",
      "Resend — transactional email (verification, password reset, notifications).",
      "Vercel — landing site + dashboard hosting; one of several deploy targets for generated apps.",
      "Cloudflare — DNS and CDN for kalit.ai and custom domains.",
      "Porkbun — domain registration (when you buy a domain through Flow).",
      "Google Analytics 4 — anonymous traffic analytics on marketing pages."
    ],
    subprocessorsNote: "A signed subprocessor list and DPA is available on request for paying customers.",
    accessTitle: "Access control",
    accessList: [
      "Least-privilege access to production systems. All admin access is logged.",
      "Production deploys go through signed pipelines and reviewed pull requests.",
      "Employee laptops use full-disk encryption and managed configuration.",
      "No customer data is copied to personal machines."
    ],
    pentestTitle: "Pentest suite",
    pentestText:
      "Kalit Pentest can perform active security testing (SQL injection, XSS, SSRF, authentication bypass, and more). It must only be used against targets you own or are explicitly authorized to test. Misuse can lead to legal liability and immediate account termination. See our Responsible Use Policy before running a scan.",
    pentestEgress:
      "Pentest scans run from dedicated egress IPs. On request, we can provide the source IP range so your team can scope monitoring and WAF rules during a scan window.",
    disclosureTitle: "Vulnerability disclosure",
    disclosureText:
      "If you believe you've found a security vulnerability in Kalit AI, please email security@kalit.ai with a description, a proof of concept and your suggested severity. We commit to:",
    disclosureCommitments: [
      "Acknowledging your report within 3 business days.",
      "Providing a triage decision within 10 business days.",
      "Coordinating public disclosure once a fix is shipped.",
      "Crediting you in the changelog if you wish."
    ],
    disclosureBounty:
      "We don't currently operate a paid bug bounty program. We do reward serious, in-scope reports with credits, swag and a public thank-you.",
    incidentTitle: "Incident response",
    incidentText:
      "We maintain an incident-response runbook covering detection, containment, customer notification and post-mortem. If a security incident materially affects your data, we will notify affected customers within 72 hours by email and post a status update at status.kalit.ai.",
    complianceTitle: "Compliance roadmap",
    complianceText:
      "Kalit AI is not yet SOC 2 or ISO 27001 certified. We follow controls aligned with these standards and intend to pursue formal certification in 2026. Compliance artifacts available today: subprocessor list, DPA, security questionnaire (on request).",
    contactTitle: "Contact",
    contactText: "For security questions, vulnerability reports, or procurement security reviews:",
    contactAddress: "Merkle Tech Labs LTD., Northlink Business Centre, Level 2, Triq Burmarrad, Naxxar, NXR 6345, Malta"
  },

  // ─── Responsible use page ────────────────────────────────
  responsibleUse: {
    metaTitle: "Responsible Use Policy - Kalit AI",
    metaDescription:
      "Acceptable use of Kalit AI, with a focused section on authorized targets for the Pentest suite. Read before running an active security scan.",
    title: "Responsible Use Policy",
    subtitle: "What you can and cannot do with Kalit AI — with special rules for Pentest. Last updated: May 13, 2026.",
    intro:
      "This Responsible Use Policy supplements our Terms of Service. It applies to every Kalit AI account and every suite (Flow, Pentest, Search, Marketing). The rules for Pentest are stricter because the suite performs active security testing against real systems. Read this page before you run a Pentest scan.",
    authTitle: "1. Authorized use only — Pentest",
    authIntro:
      "You may only use Kalit Pentest against targets where you have explicit, written authorization to perform active security testing. Acceptable authorizations include:",
    authBullets: [
      "A system that you personally own and operate.",
      "A system owned by a company that has retained you, with a signed engagement letter or pentest agreement on file.",
      "A target listed in the explicit scope of a public bug bounty program where you are an enrolled participant.",
      "A staging or test environment owned by your employer, provided your employer authorizes it."
    ],
    authConfirm:
      "Before your first Pentest scan we ask you to confirm authorization. False attestations are a material breach of our Terms and may be reported to law enforcement.",
    prohibitedTitle: "2. Prohibited targets — Pentest",
    prohibitedIntro: "You may not run Kalit Pentest against any of the following:",
    prohibitedBullets: [
      "Systems you do not own or are not contracted to test.",
      "Government, military, critical infrastructure, healthcare or financial systems, unless covered by a formal engagement.",
      "Sites and services belonging to schools, charities or minors, unless under a formal engagement.",
      "Bug bounty targets outside the published scope of an enrolled program.",
      "Third-party hosted services (e.g. shared SaaS) where your activity could affect other tenants. Scans must be confined to instances or environments you control.",
      "Any system in a country where you are subject to active sanctions or export controls."
    ],
    prohibitedNote:
      "We monitor scan targets for repeated abuse signals (e.g. spikes against high-profile domains, dictionary attacks against unrelated targets). Suspected misuse will trigger an immediate suspension pending review.",
    evidenceTitle: "3. Evidence handling",
    evidenceIntro:
      "Pentest findings often include sensitive material — credentials discovered in misconfigured files, internal URLs, customer data exposed through IDOR, etc. You agree to:",
    evidenceBullets: [
      "Treat findings as confidential to the target's owner.",
      "Not exfiltrate more data than necessary to demonstrate a vulnerability.",
      "Delete or sanitize sensitive evidence after remediation.",
      "Share Pentest reports only with people authorized by the target owner to receive them."
    ],
    generalTitle: "4. General acceptable use — all suites",
    generalIntro: "You agree not to use Kalit AI to:",
    generalBullets: [
      "Generate or distribute illegal content, including CSAM, content inciting violence, or content that violates copyright or trademark rights.",
      "Build phishing pages, malware, spyware, ransomware or other software designed to deceive, harm or compromise users.",
      "Build, train or fine-tune competing AI systems on Kalit AI outputs in bulk.",
      "Scrape, harvest or reverse-engineer Kalit AI itself.",
      "Send unsolicited bulk communications (spam) from accounts created with Marketing or Flow.",
      "Impersonate any person or organization, including Kalit AI or its staff.",
      "Circumvent rate limits, usage quotas or paywalls."
    ],
    outputTitle: "5. AI output — your responsibility",
    outputIntro:
      "Kalit AI produces code, content and security findings using language models. Outputs can be incorrect, biased, or insecure. You are responsible for reviewing output before:",
    outputBullets: [
      "Deploying generated code to production.",
      "Publishing marketing content under your brand.",
      "Acting on a Pentest finding (e.g. reporting it to a third party)."
    ],
    outputNote: "We continuously work to improve agent accuracy, but you remain the human-in-the-loop.",
    enforcementTitle: "6. Enforcement",
    enforcementIntro: "Violations of this policy may result in:",
    enforcementBullets: [
      "A warning and forced cool-down on scan or generation activity.",
      "Suspension or termination of your account without refund.",
      "Forfeiture of credits and account balance.",
      "Notification of relevant law enforcement, hosting providers or affected third parties."
    ],
    enforcementNote:
      "We may publish a transparency note about a serious enforcement action without naming individuals.",
    reportTitle: "7. Reporting abuse",
    reportText:
      "If you believe a Kalit AI user is targeting your systems without authorization, or otherwise violating this policy, email abuse@kalit.ai with timestamps, source IPs and any logs you can share. We aim to acknowledge abuse reports within 1 business day and act on confirmed reports immediately.",
    updatesTitle: "8. Updates",
    updatesText:
      "We may update this policy. Material changes will be announced in the changelog and by email to active customers at least 14 days before they take effect.",
    contactTitle: "Contact"
  },

  // ─── Changelog page ──────────────────────────────────────
  changelog: {
    metaTitle: "Changelog - Kalit AI",
    metaDescription:
      "What's new at Kalit AI. Releases across Flow, Pentest, Search and the dashboard, grouped by week.",
    title: "Changelog",
    subtitle: "What we ship, when we ship it. Newest first.",
    tagFeature: "feature",
    tagFix: "fix",
    tagChore: "chore"
  },

  // ─── Compare page ────────────────────────────────────────
  compare: {
    metaTitleIndex: "Compare Kalit AI to other AI app builders",
    metaDescriptionIndex:
      "Side-by-side comparisons of Kalit AI vs Lovable, Base44, Emergent and Bolt — capability matrices, when to pick which, and the differences that matter for launch.",
    indexTitle: "Compare Kalit AI",
    indexDescription: "Honest side-by-sides against the AI app builders you're probably also evaluating.",
    pickCompetitorTitle: "Pick {name} when",
    pickKalitTitle: "Pick Kalit AI when",
    cta: "Start with Kalit AI — free",
    cellYes: "Yes",
    cellPartial: "Partial",
    cellNo: "No",
    capabilityHeader: "Capability",
    kalitColumn: "Kalit AI",
    competitors: {
      lovable: {
        oneLiner:
          "Lovable is one of the strongest AI app builders for getting a working web app from a prompt. Kalit takes the same starting point and adds Pentest, Search and a 21-agent build team.",
        competitorOneLiner:
          "Lovable — \"AI fullstack engineer.\" Strong prompt-to-app with a large community.",
        intro:
          "Lovable is a great choice if you only need to build the app itself. Kalit AI is built for founders who need to build, secure and launch the product — not just generate code.",
        whenToPick: [
          "You want the most established prompt-to-app community.",
          "You only need code generation, not security or research.",
          "You've already chosen your hosting and growth stack."
        ],
        whenToPickKalit: [
          "You want a security report attached to every launch.",
          "You want one workspace that goes from idea to live, with research and marketing on the side.",
          "You want a multi-agent build team and an explicit task plan, not a single-shot generator.",
          "You ship in multiple languages — Kalit is localized in 16."
        ]
      },
      base44: {
        oneLiner:
          "Base44 leans into \"vibe coding\" for non-coders. Kalit takes a different stance: the output is real, portable code in a real framework, built by a coordinated agent team.",
        competitorOneLiner: "Base44 — vibe-coded web apps for non-technical builders.",
        intro:
          "Base44 is optimized for non-coders who want a working app without thinking about the stack. Kalit AI gives you the same speed but a real codebase you can take with you, plus security and growth tooling.",
        whenToPick: [
          "You don't want to see code at all.",
          "You want a single tool that hides the stack entirely.",
          "Your needs are mostly internal, low-risk apps."
        ],
        whenToPickKalit: [
          "You want code you can export, version and own.",
          "You want a pentest report before you launch.",
          "You want to graduate from a no-code feel to a real engineering workflow without switching tools.",
          "You want EU-based infra and a clear DPA path."
        ]
      },
      emergent: {
        oneLiner:
          "Emergent positions around production-ready apps from conversation. Kalit shares that ambition and adds a security suite, a multi-agent build team, and a free research front door.",
        competitorOneLiner: "Emergent — production-ready apps via natural conversation.",
        intro:
          "Emergent is a strong choice for a single-channel prompt-to-product workflow. Kalit AI extends the same idea into a four-suite software factory, with autonomous pentest as a first-class citizen.",
        whenToPick: [
          "You want a single-channel prompt-to-app experience.",
          "You don't need security tooling.",
          "Your audience is mostly US-based and English-speaking."
        ],
        whenToPickKalit: [
          "You want autonomous pentest baked in.",
          "You want 16-language localization from day one.",
          "You want both build and growth suites under one workspace.",
          "You want CVSS-scored findings with SARIF export."
        ]
      },
      bolt: {
        oneLiner:
          "Bolt is a fast in-browser builder for prototypes. Kalit is built for the next step — taking a prototype to a launchable, scanned, growth-ready product.",
        competitorOneLiner: "Bolt — in-browser AI prototyping that's fast and visual.",
        intro:
          "Bolt is a brilliant prototyping environment. Kalit AI complements it: when you outgrow the prototype phase and need a real deploy, a security scan, and a launch plan, you move to Kalit.",
        whenToPick: [
          "You want the fastest possible visual prototype.",
          "You're not yet thinking about launch or security.",
          "You're happy to migrate later."
        ],
        whenToPickKalit: [
          "You want to launch, not just prototype.",
          "You want a real Dockerized output and a real GitHub repo.",
          "You want security and research baked into the same workspace."
        ]
      }
    },
    // Capability matrix labels — same row labels reused for every competitor;
    // the competitor name interpolates into the last row at runtime.
    capabilities: [
      "Generate full-stack web apps from a prompt",
      "Deploy to production from the workspace",
      "Import existing GitHub repo to keep iterating",
      "Multi-agent build team (20+ specialist agents)",
      "Per-project Docker container ships with the build",
      "Built-in autonomous pentest with OWASP / SARIF export",
      "Compliance mapping (OWASP, CWE, PCI DSS, NIST, ISO 27001, SOC 2)",
      "Free market-research suite (Search)",
      "16-language localized UI",
      "Public portfolio of real projects (/discover)",
      "Built by {name}'s team for {name} only",
      "Founder-led, EU-based, transparent build-in-public"
    ]
  },

  // ─── Alternatives page ───────────────────────────────────
  alternatives: {
    metaTitleIndex: "Kalit AI alternatives — the AI software factory",
    metaDescriptionIndex:
      "Considering a Lovable, Base44 or Bolt alternative? Kalit AI is the multi-suite software factory built for shipping, not just generating.",
    indexTitle: "Alternatives to AI app builders",
    indexDescription: "If you're evaluating another tool, here's where Kalit AI fits.",
    whyLeaveTitle: "Why people leave {name}",
    whyKalitTitle: "What Kalit AI adds",
    cta: "Try Kalit AI — free",
    pageTitle: "The best {name} alternative",
    competitors: {
      lovable: {
        searchHook:
          "Looking for a Lovable alternative? Kalit AI starts where Lovable stops: a 21-agent build team, an autonomous pentest suite, and a workspace that goes from idea to launch.",
        whyLeave: [
          "Generated apps don't ship with any security review.",
          "Hard to keep iterating once the prompt-to-app excitement wears off.",
          "Limited support for keeping your own GitHub workflow.",
          "English-only experience for international audiences."
        ],
        whyKalit: [
          "Built-in Pentest produces a CVSS-scored, SARIF-exportable report.",
          "A 21-agent Taskforce builds, tests, ships and documents — not just generates.",
          "Bring or take any GitHub repo. Output is a real Dockerfile.",
          "16-language UI from day one — sell to global audiences without rebuilding."
        ]
      },
      base44: {
        searchHook:
          "Looking for a Base44 alternative? Kalit AI gives you the same \"prompt and ship\" speed but with real code, real Docker output, and a security report attached.",
        whyLeave: [
          "Vibe-coded apps are hard to take with you if you outgrow the platform.",
          "No security scan before you ship.",
          "Limited team workflow for agencies and product teams.",
          "Stack is hidden — debugging gets harder at scale."
        ],
        whyKalit: [
          "Real code in a real framework, exported to your GitHub.",
          "Every project is Dockerized — your infra team can take it from there.",
          "Pentest comes with the workspace, not as a third-party add-on.",
          "EU-based, founder-led, transparent build-in-public."
        ]
      },
      bolt: {
        searchHook:
          "Looking for a Bolt alternative when you need to graduate from prototype to launch? Kalit AI takes a prompt to a deployed, scanned, growth-ready product.",
        whyLeave: [
          "Bolt is excellent for prototyping, but launch tooling is thin.",
          "Migrating from prototype to a real codebase is a manual lift.",
          "No security tooling in the same workspace.",
          "No market research suite to validate before building."
        ],
        whyKalit: [
          "21-agent build team explicitly designed to ship, not just prototype.",
          "Free Search suite to validate before you build.",
          "Pentest scan included on the same workspace.",
          "Deploy to production from the same prompt."
        ]
      }
    }
  },

  // ─── Pentest extras (agents grid, standards, banner) ─────
  pentestExtras: {
    agentsEyebrow: "12 specialist agents · 11 vulnerability classes",
    agentsTitleA: "One scan, twelve specialists.",
    agentsTitleB: "No shared context lost between them.",
    agentsLede:
      "Kalit Pentest spawns one specialized agent per vulnerability class, in parallel. Each agent ships its own payload library, mutation engine, and WAF-bypass strategy — and shares findings live with the others during the scan.",
    standardsEyebrow: "Standards · Compliance · Exports",
    standardsTitleA: "Maps to the frameworks",
    standardsTitleB: "your auditor actually asks about.",
    standardsLede:
      "Every finding is CVSS 3.1-scored and mapped to the standards security teams and auditors expect. Export SARIF straight into GitHub Advanced Security or your CI pipeline.",
    reportTitle: "What's in the report",
    reportLede:
      "Every scan produces a deduplicated, false-positive-validated report — ready for engineering, security review, or an auditor.",
    reportFields: [
      "Executive summary",
      "CVSS-sorted findings",
      "Proof-of-concept evidence",
      "Remediation guidance",
      "Phase-by-phase log",
      "Compliance mappings",
      "Attack-chain narrative",
      "Retest checklist"
    ],
    authTitle: "Authorized targets only.",
    authText:
      "Kalit Pentest runs active security tests. Only run a scan against a system you own or have explicit written authorization to test.",
    authCta: "Read the rules",
    severityCritical: "CRIT",
    severityHigh: "HIGH",
    severityMedium: "MED",
    severityLow: "LOW",
    agents: [
      { name: "SQL Injection Hunter", targets: "Error-based, UNION, blind (time / boolean), out-of-band." },
      { name: "XSS Specialist", targets: "Reflected, stored, DOM-based with context-aware payload mutation." },
      { name: "SSRF Specialist", targets: "Cloud metadata (AWS / GCP / Azure), DNS rebinding, IP encoding bypasses." },
      { name: "Command Injection", targets: "Direct and blind (DNS, time, HTTP callback)." },
      { name: "Deserialization", targets: "Java, PHP, Python, .NET, Ruby gadget chains." },
      { name: "Auth Bypass", targets: "Session fixation, JWT flaws, privilege escalation." },
      { name: "IDOR Tester", targets: "Object reference manipulation across endpoints." },
      { name: "Credential Spray", targets: "Reuse testing against discovered surfaces." },
      { name: "Subdomain Takeover", targets: "CNAME fingerprinting against 15+ cloud services." },
      { name: "Cloud Auditor", targets: "Open buckets (S3 / GCS / Blob), exposed serverless endpoints." },
      { name: "WebSocket Security", targets: "CSWSH, auth bypass, message tampering." },
      { name: "GraphQL Security", targets: "Introspection, depth and complexity attacks, field auth." }
    ],
    sampleFindings: [
      { title: "SQLi — /api/auth/login" },
      { title: "SSRF — /api/avatar?url=…" },
      { title: "Stored XSS — /comments" },
      { title: "IDOR — /api/orders/:id" },
      { title: "Open S3 bucket — assets-prod" },
      { title: "Missing security headers" }
    ]
  },

  // ─── Suite landing plan cards (Flow + Pentest) ───────────
  // Hero text and feature cards on the suite pages already pull from the
  // existing `messages/{locale}.json` via t(). The plan card data lived in
  // landing-data.ts as hardcoded English; lifting it here so it translates
  // through the same page-strings deep-merge resolver.
  suitePlans: {
    // Shared labels
    perMonth: "per month",
    toStart: "to start",
    launchPick: "Launch pick",
    flow: {
      starter: {
        name: "Starter",
        tagline: "For testing Flow and shipping a first page.",
        features: [
          "Kalit Flow access",
          "75 credits / month",
          "AI-generated landing pages",
          "Live previews",
          "Custom domain support"
        ],
        buttonText: "Start with Flow"
      },
      launch: {
        name: "Launch",
        tagline: "For founders preparing a public launch.",
        features: [
          "Flow + Kalit Studio",
          "350 credits / month",
          "Deploy and redeploy pages",
          "Project files and exports",
          "Priority support"
        ],
        buttonText: "Build my launch site"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "For teams that want launch pages plus security review.",
        features: [
          "Flow + Pentest access",
          "1,200 credits / month",
          "Pre-launch security scan",
          "Report export",
          "Custom onboarding"
        ],
        buttonText: "Launch with scan"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "For reviewing the workflow and sample reports.",
        features: [
          "Sample findings report",
          "Workspace preview",
          "Scope planning in Studio",
          "Authorized target intake",
          "Upgrade when ready to scan"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Pre-launch Scan",
        tagline: "For one app, API, or staging target before launch.",
        features: [
          "Quick or standard scan profiles",
          "Live phase feed",
          "Findings with evidence",
          "PDF/HTML report export",
          "Remediation guidance"
        ],
        buttonText: "Start scan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "For deeper scans, retests, and launch teams.",
        features: [
          "Deep and targeted scan profiles",
          "Multiple workspaces",
          "Finding retests",
          "Advisory runs",
          "Priority support"
        ],
        buttonText: "Secure my launch"
      }
    }
  },

  // ─── Blog chrome (index + post detail labels) ────────────
  blog: {
    metaTitle: "Blog - Kalit AI",
    metaDescription:
      "Notes from the team behind Kalit AI — why we're building an AI software factory, how Taskforce and Pentest actually work, and what we ship next.",
    title: "Kalit Blog",
    description: "Build notes, technical deep-dives and product thinking from the Kalit team.",
    featured: "Featured",
    minRead: "min read",
    allPosts: "← All posts",
    keepReading: "Keep reading",
    onThisPage: "On this page",
    shareX: "Share on X",
    shareLinkedIn: "Share on LinkedIn",
    shareHN: "Share on Hacker News",
    empty: "No posts yet. Check back soon."
  }
} as const

export type PageStrings = typeof EN_PAGE_STRINGS
