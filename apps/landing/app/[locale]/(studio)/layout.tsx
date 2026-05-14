import { auth } from "@/lib/auth"
import { StudioShell } from "./studio-shell"

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
