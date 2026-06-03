/**
 * Seed prompt for the magnet's pre-seeded studio build.
 *
 * Phrased to reliably trigger the broker agent's autonomous chain:
 *   import_page_assets(url) → taskforce_create(project_type:"landing",
 *   source-grounded) → deploy_project → live *.kalit.ai URL.
 *
 * It hands the agent the exact teaser findings so the rebuild visibly fixes
 * what we told the visitor was wrong — closing the loop on the roast.
 */
interface TeaserProblemLike {
  title: string
  detail: string
}

export function buildSeedPrompt(url: string, problems: TeaserProblemLike[]): string {
  const fixes = (problems || [])
    .slice(0, 4)
    .map((p, i) => `${i + 1}. ${p.title} — ${p.detail}`)
    .join("\n")

  return `Rebuild the landing page at ${url} into a higher-converting version of the SAME page — it should be recognisably their page, in their brand, just fixed. Not a clone of its flaws, and not a generic template.

1. Import the page's real assets and content from ${url} (logo, images, colours, fonts, and the actual copy). Read assets/imported-page.html and preserve the page's real information architecture: keep the SAME sections in roughly the same order, and the SAME real headlines, products, value propositions and testimonials. Do NOT invent placeholder content, and do NOT drop their real content — the visitor must recognise it as their own page.

2. Within that structure, fix the specific problems we found:
${fixes || "Strengthen the hero, clarify the value proposition, and add a single prominent call to action."}
Improve hero clarity, make the primary call-to-action prominent, tighten (don't delete) the copy, ensure it looks great on mobile, and add a strong meta description.

3. Keep the original product, tone and language.

If ${url} is a web app (a login wall or app shell) rather than a marketing page, build a strong marketing/landing page for that product instead of trying to reproduce the app's internals.

Finally, deploy it and give me the live preview URL.`
}
