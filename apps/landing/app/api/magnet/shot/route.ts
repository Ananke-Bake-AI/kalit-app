/**
 * GET /api/magnet/shot?u=<target url> — screenshot proxy.
 *
 * Renders the target via the configured provider (thum.io by default), but
 * rejects blank/failed captures (JS-heavy or bot-blocking sites that come back
 * white) with a 502 so the client's <img> onError shows a clean fallback
 * instead of a blank white box. Successful captures are streamed with a long
 * cache so repeat/share loads are instant.
 */
import { NextRequest, NextResponse } from "next/server"
import { normalizeUrl, providerShotUrl } from "@/lib/magnet/teaser"

export const runtime = "nodejs"

// A real 1200px render is comfortably above this; blank/placeholder captures
// (white pages, 1x1s, "generating" stubs) fall well under it.
const MIN_BYTES = 12_000

export async function GET(req: NextRequest) {
  const target = normalizeUrl(req.nextUrl.searchParams.get("u") || "")
  if (!target) {
    return NextResponse.json({ error: "Bad url" }, { status: 400 })
  }

  const provider = providerShotUrl(target)
  const fetchOnce = async (): Promise<Buffer | null> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 18000)
    try {
      const res = await fetch(provider, { signal: ctrl.signal })
      if (!res.ok) return null
      const ct = res.headers.get("content-type") || ""
      const buf = Buffer.from(await res.arrayBuffer())
      // Reject non-images and blank/placeholder captures.
      if (!ct.startsWith("image/") || buf.byteLength < MIN_BYTES) return null
      return buf
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // Cold renders can come back blank/placeholder; the provider has usually
  // finished (and cached) a few seconds later. Retry twice before giving up.
  let buf = await fetchOnce()
  for (let i = 0; i < 2 && !buf; i++) {
    await new Promise((r) => setTimeout(r, 3500))
    buf = await fetchOnce()
  }
  if (!buf) return NextResponse.json({ error: "blank capture" }, { status: 502 })

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Cache hard — screenshots are stable for the teaser's lifetime.
      "Cache-Control": "public, max-age=43200, s-maxage=43200, immutable",
    },
  })
}
