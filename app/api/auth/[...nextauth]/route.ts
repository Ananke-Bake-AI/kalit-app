import { handlers } from "@/lib/auth"

export const POST = handlers.POST

// Wrap GET to strip the "iss" parameter from OAuth callbacks.
// GitHub sends iss=https://github.com/login/oauth (RFC 9207) but
// @auth/core@0.41 validates it against a hardcoded fallback issuer
// ("https://authjs.dev") for non-OIDC providers, causing a mismatch.
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.has("iss")) {
    url.searchParams.delete("iss")
    req = new Request(url, {
      method: req.method,
      headers: req.headers,
    })
  }
  return handlers.GET(req as any)
}
