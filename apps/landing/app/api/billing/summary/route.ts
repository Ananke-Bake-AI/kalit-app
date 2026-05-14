import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getBillingSummary } from "@/lib/billing-summary"

/**
 * GET /api/billing/summary
 *
 * Returns the BillingSummary for the signed-in user's active org.
 * Used by the Header + TrialBanner client-side after mount so the
 * /studio layout SSR doesn't need to block on 4 Prisma round-trips
 * to Neon (eu-central-1) from a Vercel function in iad1.
 *
 * The work itself is cached by `getBillingSummary` (unstable_cache,
 * 30 s, per-org tag) so back-to-back hits in the same window cost
 * one DB resolve total. The handler itself is just an auth gate +
 * JSON wrapper.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const summary = await getBillingSummary(session.user.orgId)
  return NextResponse.json({ summary })
}
