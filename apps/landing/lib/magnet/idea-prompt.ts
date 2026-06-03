/**
 * Seed prompt for the idea-finder → Kalit Flow upsell.
 *
 * Honest about today's capability: Flow ships a polished demo/marketing site
 * for the idea (not the full backend product). That's exactly what a founder
 * wants first — a live page to feel the concept and test demand. Grounded in
 * the Search idea's real fields so the demo reflects the validated opportunity.
 */
import type { SearchProject } from "./search"
import { parseStringArray } from "./search"

export function buildIdeaSeedPrompt(p: SearchProject): string {
  const name = (p.name || "this startup idea").trim()
  const audience = (p.targetAudience || "").trim()
  const angle = (p.uniqueAngle || "").trim()
  const why = (p.whyNow || "").trim()
  const model = (p.revenueModel || p.monetizationType || "").trim()
  const keywords = parseStringArray(p.trendKeywords).slice(0, 6).join(", ")

  return `Build a polished, high-converting demo landing page for a startup called "${name}". This is a real, data-validated opportunity from Kalit Search — make a launch-ready marketing site a founder could put in front of early users today to test demand.

What it is: ${(p.description || "").trim() || name}.
${audience ? `Who it's for: ${audience}.\n` : ""}${angle ? `The unique angle to lead with: ${angle}.\n` : ""}${why ? `Why now (use this for urgency/social proof framing): ${why}.\n` : ""}${model ? `How it makes money (hint pricing/CTA accordingly): ${model}.\n` : ""}${keywords ? `Relevant themes: ${keywords}.\n` : ""}
Make it convincing and specific to this concept — a strong hero with a clear value proposition, the core benefits, how it works, social-proof/credibility cues, and a single prominent call to action (waitlist or early-access signup). Pick a clean, modern brand look that fits the category. Do NOT use placeholder lorem text — write real, concrete marketing copy for this idea.

Finally, deploy it and give me the live preview URL.`
}
