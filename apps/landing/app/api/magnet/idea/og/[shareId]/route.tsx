/**
 * GET /api/magnet/idea/og/[shareId] — dynamic OG card for a shared idea brief.
 * Top idea name + opportunity score ring + "Found with Kalit Search".
 */
import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import type { IdeaTeaser } from "@/lib/magnet/idea-types"

export const runtime = "nodejs"

function scoreColor(n: number) {
  return n >= 75 ? "#22c55e" : n >= 50 ? "#f59e0b" : "#a78bfa"
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params
  let name = "Your next startup"
  let category = ""
  let score = 0
  try {
    const m = await prisma.magnetSession.findUnique({
      where: { shareId },
      select: { teaser: true },
    })
    const t = (m?.teaser || {}) as unknown as IdeaTeaser
    const top = t.ideas?.[0]
    if (top) {
      name = top.name || name
      category = top.category || ""
      score = top.scores?.opportunity || 0
    }
  } catch {
    /* generic card on failure */
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
          FOUND WITH KALIT SEARCH
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
            {category ? (
              <div style={{ display: "flex", fontSize: 30, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: 1 }}>{category}</div>
            ) : null}
            <div style={{ display: "flex", fontSize: 66, fontWeight: 800, lineHeight: 1.05, marginTop: 14 }}>{name}</div>
            <div style={{ display: "flex", fontSize: 28, color: "#94a3b8", marginTop: 22, maxWidth: 600 }}>
              A 2026 opportunity scored from real demand signals — see the full brief.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 250,
              height: 250,
              borderRadius: 250,
              border: `12px solid ${color}`,
              background: "rgba(255,255,255,0.03)",
              flexShrink: 0,
              marginLeft: 32,
            }}
          >
            <div style={{ display: "flex", fontSize: 116, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
            <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>opportunity</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#e2e8f0" }}>kalit.ai/idea-finder</div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
