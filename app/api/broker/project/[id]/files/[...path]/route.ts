import { NextRequest } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  const { id, path } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const filePath = path.join("/")
  const res = await brokerProxy(`project/${id}/files/${filePath}`, result.token)
  if (!res.ok) {
    return new Response("Not found", { status: res.status })
  }

  const data = await res.arrayBuffer()
  return new Response(data, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Cache-Control": "public, max-age=60",
    },
  })
}
