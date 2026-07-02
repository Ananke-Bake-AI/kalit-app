/**
 * SEO trim: set concise seoTitle (<=48 chars → full <title> <=~59) and seoDescription
 * (<=155) on existing posts whose titles/descriptions were truncating in SERPs. These are
 * OVERRIDE fields — they change only the <title>/meta tag, never the visible H1 or lede.
 * Idempotent. Run from apps/landing on the server:  node_modules/.bin/tsx scripts/seo-title-desc-trim.ts
 */
import fs from "node:fs"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    let line = raw.trim()
    if (!line || line.startsWith("#")) continue
    if (line.startsWith("export ")) line = line.slice(7).trim()
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!(key in process.env)) process.env[key] = val
  }
}
loadEnv(path.join(__dirname, "..", ".env"))
const prisma = new PrismaClient()

const TRIM: Record<string, { seoTitle?: string; seoDescription?: string }> = {
  "how-much-does-a-penetration-test-cost": { seoTitle: "Penetration Test Cost: 2026 Pricing Guide" },
  "how-to-build-a-landing-page-with-ai": {
    seoTitle: "How to Build a Landing Page With AI",
    seoDescription:
      "How to build an AI landing page with custom images, icons and fonts — not generic template assets — so it looks unique, researched and sourced for you."
  },
  "how-to-find-your-first-100-customers": {
    seoTitle: "How to Find Your First 100 Customers",
    seoDescription:
      "The channel-by-channel playbook for your first 100 customers: communities, doing things that don't scale, launches, waitlists and referrals."
  },
  "how-to-launch-an-mvp-without-writing-code-in-one-sitting": { seoTitle: "Launch an MVP Without Writing Code" },
  "how-to-pentest-your-web-app-before-launch": { seoTitle: "How to Pentest Your Web App Before Launch" },
  "how-to-size-your-market-tam-sam-som": { seoTitle: "How to Size Your Market: TAM, SAM, SOM" },
  "how-to-validate-a-saas-idea-before-you-build-anything": { seoTitle: "How to Validate a SaaS Idea Before Building" },
  "how-to-write-landing-page-copy-that-converts": { seoTitle: "Landing Page Copy That Converts (Examples)" },
  "idor-explained": { seoTitle: "IDOR Explained: The Bug That Leaks Data" },
  "owasp-top-10-explained-for-founders": {
    seoTitle: "OWASP Top 10, Explained for Founders",
    seoDescription:
      "A plain-English walk through the OWASP Top 10 web security risks for founders — what each is, how it bites, and the one thing to do about it."
  },
  "pre-launch-security-checklist-for-founders": { seoTitle: "Pre-Launch Security Checklist for Founders" },
  "seo-basics-for-a-new-saas-landing-page": {
    seoTitle: "SEO Basics for a New SaaS Landing Page",
    seoDescription:
      "A practical SEO starter checklist for a new SaaS landing page: keywords, title tags, headings, Core Web Vitals, sitemap, schema and indexing."
  },
  "the-2026-launch-stack-for-solo-founders": {
    seoTitle: "The 2026 Launch Stack for Solo Founders",
    seoDescription:
      "The end-to-end map for launching solo in 2026: validate, build a landing page, capture intent, secure it, get found, and win your first users."
  },
  "the-5-cliffs-where-people-actually-quit-when-building-with-ai": { seoTitle: "The 5 Cliffs Where People Quit Building With AI" },
  "why-your-ai-generated-app-breaks-in-production": {
    seoTitle: "Why AI-Generated Apps Break in Production",
    seoDescription:
      "The gap between 'works in preview' and 'works for real users' — the predictable ways AI-built apps break in production, and how to get ahead of it."
  },
  "best-ai-website-builders-for-founders-2026": {
    seoDescription:
      "An honest buyer's guide to AI website builders — app generators vs classic builders vs design-led tools — and how to pick the right one."
  },
  "is-it-safe-to-launch-an-app-built-with-ai": {
    seoDescription:
      "Yes — if you check what AI builders skip. Where AI-generated code is weak (auth, input, secrets, config, deps) and a pre-launch routine to ship safe."
  }
}

async function main() {
  let n = 0
  for (const [slug, data] of Object.entries(TRIM)) {
    const r = await prisma.blogPost.updateMany({ where: { slug }, data })
    console.log(`${r.count ? "✓" : "· (not found)"} ${slug}`)
    n += r.count
  }
  console.log(`Updated ${n} posts.`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
