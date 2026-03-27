/** Chemin sur l’app Kalit après connexion (page Flow marketing). */
export const FLOW_MARKETING_PATH = "/flow"

export function flowLoginHref(options?: { prompt?: string }): string {
  const path =
    options?.prompt !== undefined && options.prompt !== ""
      ? `${FLOW_MARKETING_PATH}?prompt=${encodeURIComponent(options.prompt)}`
      : FLOW_MARKETING_PATH
  return `/login?callbackUrl=${encodeURIComponent(path)}`
}

export function flowSuiteEntryUrl(suiteAppUrl: string, options?: { prompt?: string }): string {
  const base = suiteAppUrl.replace(/\/$/, "")
  const prompt = options?.prompt?.trim()
  if (!prompt) return base
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}prompt=${encodeURIComponent(prompt)}`
}
