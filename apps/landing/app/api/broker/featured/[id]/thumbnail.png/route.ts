import { NextRequest } from "next/server"

const BROKER_URL = () =>
  (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")

/**
 * Public thumbnail proxy for featured projects on the landing.
 *
 * The user-owned /api/broker/projects/[id]/thumbnail.png is auth-gated.
 * For featured projects, we want anonymous visitors to load thumbnails
 * — so this endpoint hits the broker without a JWT and only succeeds
 * if the project is currently featured (the broker enforces that
 * implicitly: the public list endpoint is what the landing renders, so
 * the id only ever shows up if it's already public).
 *
 * To avoid scraping every project's thumbnail by ID-guess, the broker
 * SHOULD serve thumbnails for non-featured projects only when an
 * authenticated owner asks. We achieve that by NOT shipping a public
 * thumbnail route on the broker side — the public list endpoint
 * embeds the URL via /api/broker/featured/{id}/thumbnail.png which the
 * landing rewrites to /internal/admin/... Wait — that's not right.
 *
 * Simpler implementation: the broker public list returns hasThumbnail
 * + the canonical site URL only. Thumbnails for featured projects are
 * served by the broker BEHIND a token-less endpoint that checks
 * featured_at IS NOT NULL on each request. Add it on the broker side
 * with a simple route — done in cmd/broker/featured_projects.go.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(
    `${BROKER_URL()}/api/flow/featured-projects/${id}/thumbnail.png`,
    { cache: "no-store" },
  )
  if (!res.ok) {
    return new Response(null, { status: 404 })
  }
  const body = await res.arrayBuffer()
  return new Response(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  })
}
