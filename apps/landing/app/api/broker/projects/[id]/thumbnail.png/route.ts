import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

/** GET /api/broker/projects/{id}/thumbnail.png — proxy for the repository
 * thumbnail. NOT auth-gated: /discover and the public /u/{username} profiles
 * are viewable logged-out, so the broker serves public/featured thumbnails to
 * anyone (and still owner-checks private ones). We forward a signed JWT when
 * the visitor is logged in, and proxy anonymously otherwise. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  // Anonymous visitors get an empty token; the broker serves public/featured
  // thumbnails before the auth check, and 401s private ones (→ 404 below).
  const token = "error" in result ? "" : result.token

  const res = await brokerProxy(`projects/${id}/thumbnail.png`, token)
  if (!res.ok) {
    // Fall through to client-side placeholder rather than a 404 image
    return new Response(null, { status: 404 })
  }
  const body = await res.arrayBuffer()
  return new Response(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/png",
      "Cache-Control": res.headers.get("cache-control") || "public, max-age=86400",
    },
  })
}
