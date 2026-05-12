import { requireAdmin } from "@/lib/admin"
import { getBillingSummary } from "@/lib/billing-summary"
import { Wrapper } from "@/components/layout/wrapper"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const billingSummary = await getBillingSummary(session?.user?.orgId ?? null)

  return <Wrapper session={session} billingSummary={billingSummary}>{children}</Wrapper>
}
