import { auth } from "@/lib/auth"
import { Wrapper } from "@/components/layout/wrapper"

// Billing summary is now fetched client-side by BillingSummaryProvider
// (mounted inside <Wrapper>) — no more SSR await on a transatlantic
// Neon round-trip for the header credit badge.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return <Wrapper session={session}>{children}</Wrapper>
}
