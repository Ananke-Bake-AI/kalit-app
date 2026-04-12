import { NextRequest } from "next/server"
import { authAndToken, brokerProxy } from "@/lib/broker-server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await authAndToken()
  if ("error" in result) return result.error

  const res = await brokerProxy(`project/${id}/iframe`, result.token)
  if (!res.ok) {
    return new Response("Not found", { status: res.status })
  }

  const html = await res.text()
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
