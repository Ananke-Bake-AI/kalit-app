/**
 * GET /llms.txt — the llmstxt.org convention: a concise, curated Markdown
 * overview of the site for LLMs / answer engines. Generated from live data so
 * the blog list stays current. See https://llmstxt.org.
 */
import { APP_BASE_URL } from "@/lib/config"
import { DEFAULT_LOCALE } from "@/lib/i18n"
import { listPublishedPosts } from "@/app/[locale]/(home)/blog/posts-server"
import { GLOSSARY } from "@/lib/glossary"

export const revalidate = 3600

export async function GET() {
  const base = APP_BASE_URL.toString().replace(/\/$/, "")
  const posts = await listPublishedPosts(DEFAULT_LOCALE)

  const guides = posts
    .map((p) => `- [${p.title}](${base}/blog/${p.slug}): ${p.description}`)
    .join("\n")

  const glossary = GLOSSARY
    .map((t) => `- [${t.term}](${base}/glossary/${t.slug}): ${t.short}`)
    .join("\n")

  const body = `# Kalit AI

> Kalit AI is a suite of AI agents that help founders launch products: build a custom landing page, run a pre-launch security scan, and research a market — fast, from a prompt.

Kalit AI (${base}) gives early-stage founders and indie builders specialized AI agents for the launch journey. Each "suite" is a focused product:

- **Kalit Flow** turns a prompt into a landing page with real, custom assets (images, icons, fonts, and a colour palette) sourced by AI research agents instead of generic template stock, published to a live hosted URL.
- **Kalit Pentest** is an autonomous, non-destructive pre-launch security scan. Around a dozen specialist agents probe an authorized target from reconnaissance to exploitation and return findings with a CVSS severity, reproducible evidence, and remediation, exported as SARIF, PDF, or HTML — in minutes rather than the weeks and ~€15–20k of a traditional firm engagement.
- **Kalit Search** does market and competitor research from a prompt.

## Products

- [Kalit Flow](${base}/flow): Build a custom landing page with AI — real, AI-sourced assets, published to a live URL.
- [Kalit Pentest](${base}/pentest): Autonomous, non-destructive pre-launch security scan with evidence and fixes.
- [Kalit Search](${base}/search): Market and competitor research from a prompt.
- [Pricing](${base}/pricing): Plans and pricing.

## Guides and articles

${guides}

## Glossary

${glossary}

## Company and reference

- [Compare Kalit](${base}/compare): How Kalit compares to other tools.
- [Alternatives](${base}/alternatives): Kalit as an alternative to popular AI builders.
- [Security](${base}/security): Kalit's security practices.
- [About](${base}/about): About Kalit AI.
- [Blog](${base}/blog): All articles.
`

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600"
    }
  })
}
