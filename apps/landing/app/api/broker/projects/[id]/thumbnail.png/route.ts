import { NextRequest, NextResponse } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

/** GET /api/broker/projects/{id}/thumbnail.png — auth-gated proxy for the
 * repository thumbnail. The broker checks ownership server-side; we just
 * sign a JWT and forward bytes. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`projects/${id}/thumbnail.png`, result.token)
  if (!res.ok) {
    // Fall through to client-side placeholder rather than a 404 image
    return new Response(null, { status: 404 })
  }
  const body = await res.arrayBuffer()
  return new Response(body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/png",
      "Cache-Control": "private, max-age=86400",
    },
  })
}
