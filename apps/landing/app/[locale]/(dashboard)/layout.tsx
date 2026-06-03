import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { Wrapper } from "@/components/layout/wrapper"
import { CheckoutSuccessTracker } from "@/components/analytics/checkout-success-tracker"

// Billing summary is now fetched client-side by BillingSummaryProvider
// (mounted inside <Wrapper>) — no more SSR await on a transatlantic
// Neon round-trip for the header credit badge.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <Wrapper session={session}>
      {/* Fires purchase_completed on Stripe ?checkout=success. */}
      <Suspense fallback={null}>
        <CheckoutSuccessTracker />
      </Suspense>
      {children}
    </Wrapper>
  )
}
