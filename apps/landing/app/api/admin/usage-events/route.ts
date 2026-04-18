import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { brokerFetchAs } from "@/lib/broker-server"
import { isAdmin } from "@/lib/admin"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await isAdmin(session.user.email)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = new URL(req.url)
  const params = new URLSearchParams()
  params.set("all", "1")
  const since = url.searchParams.get("since")
  const limit = url.searchParams.get("limit")
  if (since) params.set("since", since)
  params.set("limit", limit || "200")

  const data = await brokerFetchAs<unknown>(`/api/usage/events?${params.toString()}`)
  if (!data) return NextResponse.json({ error: "broker unreachable" }, { status: 502 })
  return NextResponse.json(data)
}
