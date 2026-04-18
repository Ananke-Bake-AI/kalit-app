import { requireAdmin } from "@/lib/admin"
import { brokerFetchAs } from "@/lib/broker-server"
import { ConsoleClient, type UsageEvent } from "./console-client"

type UsageListResponse = { events: UsageEvent[] }

export default async function AdminConsolePage() {
  await requireAdmin()
  const initial = await brokerFetchAs<UsageListResponse>("/api/usage/events?all=1&limit=200")
  return <ConsoleClient initialEvents={initial?.events ?? []} />
}
