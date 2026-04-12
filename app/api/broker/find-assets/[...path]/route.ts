import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const findAssetsUrl = process.env.FIND_ASSETS_URL || "https://find-assets.xyz"
  const targetUrl = `${findAssetsUrl}/${path.join("/")}`

  const headers: Record<string, string> = {}
  const apiKey = process.env.FIND_ASSETS_API_KEY || ""
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }

  const resp = await fetch(targetUrl, { headers })
  if (!resp.ok) {
    return new Response("Not found", { status: resp.status })
  }

  const data = await resp.arrayBuffer()
  return new Response(data, {
    headers: {
      "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
