import { auth } from "@/lib/auth"
import { getBillingSummary } from "@/lib/billing-summary"
import { Wrapper } from "@/components/layout/wrapper"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const billingSummary = await getBillingSummary(session?.user?.orgId ?? null)

  return <Wrapper session={session} billingSummary={billingSummary}>{children}</Wrapper>
}
