/**
 * Shared logic for creating a broker session and navigating to /studio.
 * Used by suite hero prompts and the home page hero.
 */

import type { SuiteId } from "@/lib/suites"

/**
 * Return the /studio URL carrying the user's prompt. On arrival the studio
 * creates the session with this prompt as its first message.
 *
 * On ne pré-crée PLUS de session ici : ça laissait une session vide en DB si
 * l'utilisateur repartait avant d'envoyer. Le studio (studio-v2) crée la
 * session au 1er message via ?prompt=. Async conservé pour ne pas changer les
 * appelants (qui `await`).
 */
export async function createStudioSession(
  prompt: string,
  suiteId: SuiteId,
): Promise<string> {
  return `/studio?prompt=${encodeURIComponent(prompt)}&suite=${suiteId}`
}

/**
 * Build a login URL that redirects back to /studio after auth.
 */
export function studioLoginHref(prompt: string, suiteId: SuiteId): string {
  const studioPath = `/studio?prompt=${encodeURIComponent(prompt)}&suite=${suiteId}`
  return `/login?callbackUrl=${encodeURIComponent(studioPath)}`
}
