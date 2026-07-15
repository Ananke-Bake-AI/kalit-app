import { getAppSettings } from "@/server/actions/admin"
import { SettingsClient } from "./settings-client"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const result = await getAppSettings()
  return (
    <SettingsClient
      initialStripe={result.stripeKeys}
      initialMeta={result.metaKeys}
      initialGa={result.gaKeys}
    />
  )
}
