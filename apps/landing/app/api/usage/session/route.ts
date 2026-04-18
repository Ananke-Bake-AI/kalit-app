import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { brokerFetchAs } from "@/lib/broker-server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const sessionId = url.searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })

  const params = new URLSearchParams()
  params.set("sessionId", sessionId)
  const since = url.searchParams.get("since")
  if (since) params.set("since", since)
  params.set("limit", url.searchParams.get("limit") || "100")

  const data = await brokerFetchAs<unknown>(`/api/usage/events?${params.toString()}`)
  if (!data) return NextResponse.json({ error: "broker unreachable" }, { status: 502 })
  return NextResponse.json(data)
}
