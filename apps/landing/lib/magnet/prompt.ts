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
    .slice(0, 3)
    .map((p, i) => `${i + 1}. ${p.title} — ${p.detail}`)
    .join("\n")

  return `Clone and rebuild the landing page at ${url} into a higher-converting version.

First, import the page's real assets and styling from ${url} (its logo, images, colours, fonts and copy) so the rebuild stays faithful to the existing brand — do NOT invent a new brand or generic placeholder content.

Then build an improved, modern, mobile-first landing page that keeps that brand identity but fixes these specific problems we found:
${fixes || "Strengthen the hero, clarify the value proposition, and add a single prominent call to action."}

Keep the same product, tone and language as the original. Improve the hero, make the primary call-to-action obvious, tighten the copy, and ensure it looks great on mobile.

Finally, deploy it and give me the live preview URL.`
}
