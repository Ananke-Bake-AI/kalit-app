import { auth } from "@/lib/auth"
import { getBillingSummary } from "@/lib/billing-summary"
import { StudioShell } from "./studio-shell"

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const billingSummary = await getBillingSummary(session?.user?.orgId ?? null)
  return <StudioShell session={session} billingSummary={billingSummary}>{children}</StudioShell>
}
