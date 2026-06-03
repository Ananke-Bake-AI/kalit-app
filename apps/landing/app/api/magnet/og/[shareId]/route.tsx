/**
 * GET /api/magnet/og/[shareId] — dynamic OG card for a shared roast.
 * Before/after-style: big colored score + hostname + "Roasted by Kalit".
 * Referenced from the share page's metadata (MetadataSeo image param).
 */
import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

function scoreColor(n: number) {
  return n >= 75 ? "#22c55e" : n >= 50 ? "#f59e0b" : "#ef4444"
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params
  let score = 0
  let host = "your site"
  try {
    const m = await prisma.magnetSession.findUnique({
      where: { shareId },
      select: { teaser: true },
    })
    const t = (m?.teaser || {}) as { score?: number; finalUrl?: string }
    if (typeof t.score === "number") score = t.score
    if (t.finalUrl) {
      try { host = new URL(t.finalUrl).hostname.replace(/^www\./, "") } catch { /* keep default */ }
    }
  } catch {
    /* render a generic card on lookup failure */
  }
  const color = scoreColor(score)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b0b14 0%, #16121f 100%)",
          color: "#fff",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, letterSpacing: 2, color: "#a78bfa", fontWeight: 700 }}>
          ROASTED BY KALIT
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div style={{ display: "flex", fontSize: 34, color: "#cbd5e1" }}>{host}</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>Conversion score</div>
            <div style={{ display: "flex", fontSize: 28, color: "#94a3b8", marginTop: 20, maxWidth: 560 }}>
              See the 3 biggest problems — then rebuild it live.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 280,
              height: 280,
              borderRadius: 280,
              border: `12px solid ${color}`,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "flex", fontSize: 130, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
            <div style={{ display: "flex", fontSize: 30, color: "#94a3b8" }}>/ 100</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#e2e8f0" }}>kalit.ai/roast-landing</div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
