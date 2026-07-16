import type { Viewport } from "next"
import { auth } from "@/lib/auth"
import { StudioShell } from "./studio-shell"

// Studio-scoped viewport: ask the browser to SHRINK the layout viewport when the
// virtual keyboard opens (so 100dvh collapses back on close, no leftover gap).
// Chrome/Android + future WebKit honor it; iOS Safari ignores it today, so the
// JS visualViewport handling in StudioShell is the real fallback for iOS.
export const viewport: Viewport = { interactiveWidget: "resizes-content" }

// Layout no longer awaits getBillingSummary — that fetch costs ~700 ms
// when Vercel runs the function in iad1 against Neon in eu-central-1,
// which was the bulk of the perceived "2 s freeze" when clicking the
// Studio button. Billing data now arrives client-side via the
// BillingSummaryProvider inside <StudioShell> (fetches /api/billing/
// summary after mount; the response is server-cached for 30 s per org
// so the second hit is near-free).
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return <StudioShell session={session}>{children}</StudioShell>
}
