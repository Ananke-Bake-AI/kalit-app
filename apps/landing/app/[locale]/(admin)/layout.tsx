import { requireAdmin } from "@/lib/admin"
import { Wrapper } from "@/components/layout/wrapper"

// Billing summary now resolves client-side via BillingSummaryProvider
// inside <Wrapper>. Admin routes drop the SSR await for the same
// reason as dashboard/studio — the credit badge isn't critical for
// initial paint and the layout shouldn't block on a Neon round-trip.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  return <Wrapper session={session}>{children}</Wrapper>
}
