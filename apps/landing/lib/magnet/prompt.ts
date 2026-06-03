/**
 * Seed prompt for the magnet's pre-seeded studio build.
 *
 * IMPORTANT: it directs the agent STRAIGHT to taskforce_create — NOT
 * import_page_assets. The old static import returns 0 assets on JS/SPA sites
 * (airbnb, dofus…), which made the agent narrate "dynamic rendering…" and end
 * its turn WITHOUT building. taskforce_create auto-runs the rendered Playwright
 * extraction (real logo/hero/assets/palette/copy → attachments) on its own, so
 * import_page_assets is both redundant and harmful here.
 *
 *   taskforce_create(project_type:"landing", source-grounded) → deploy_project
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

  return `I'm the owner of ${url} and I want to improve my OWN landing page into a higher-converting version — same brand, same content, just better.

Call taskforce_create now (project_type: "landing"). Do NOT call import_page_assets — Kalit automatically renders ${url} and attaches my page's real assets (my logo, hero image, product shots, palette, fonts, copy and section structure). Build using those real attachments — follow the source-grounding contract; don't substitute a text logo, gradient, or placeholder for a real attached image.

Keep my real sections in roughly the same order, with my real headlines, products, value props and testimonials, while fixing:
${fixes || "Strengthen the hero, clarify the value proposition, and add a single prominent call to action."}
Improve hero clarity, make the primary call-to-action prominent, tighten (don't delete) the copy, ensure it looks great on mobile, and add a strong meta description. Keep my product, tone and language.

If ${url} is a web app (a login wall or app shell) rather than a marketing page, build a strong marketing/landing page for the product instead of reproducing the app's internals.

Then deploy it and give me the live preview URL.`
}
