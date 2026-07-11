// Client mirror of the broker's promptboost detector — scores a prompt's
// specificity live so the composer can show a discreet "quality" halo. Keep the
// regexes in sync with broker/internal/commands/promptboost.go.

const ARTIFACT = /\b(site|landing|page|app|appli|application|webapp|web app|dashboard|portfolio|boutique|shop|blog|vitrine|plateforme|platform|e-?commerce|one[- ]?page)\b/i;
const EDIT_SIGNAL = /\b(change|modifie|corrige|ajoute|rajoute|retire|enl[èe]ve|d[ée]place|remplace|au lieu|plus grand|plus petit|trop|bug|fix|pourquoi|comment|est-ce|peux-tu|merci|bonjour|salut)\b/i;

export type PromptLevel = 'none' | 'low' | 'mid' | 'high';

// 'none' = not a build request (tweak / question / empty) → no halo.
// low/mid = an under-specified build request the broker would enrich.
// high  = already rich & directed (leave it alone) → green.
export function promptLevel(text: string): PromptLevel {
  const p = text.trim();
  if (!p || EDIT_SIGNAL.test(p)) return 'none';
  // A web-artifact noun (site/landing/app…) is enough to read it as a build
  // request — a build verb is a bonus, not required ("une landing pour X"
  // counts too). Kept in sync with broker/internal/commands/promptboost.go.
  if (!ARTIFACT.test(p)) return 'none';
  const words = p.split(/\s+/).length;
  if (words < 20) return 'low';
  if (words < 45) return 'mid';
  return 'high';
}
