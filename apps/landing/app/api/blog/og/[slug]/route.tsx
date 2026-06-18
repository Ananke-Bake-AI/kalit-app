/**
 * GET /api/blog/og/[slug] — dynamic Open Graph card for a blog post.
 * Used as the OG/Twitter image fallback when a post has no cover/OG image set,
 * so every post shares with its own title + tags instead of a generic thumbnail.
 * Optional ?locale= renders the translated title when available.
 */
import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

interface Translation {
  title?: string
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const locale = new URL(req.url).searchParams.get("locale") || "en"

  let title = "Kalit Blog"
  let tags: string[] = []
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { title: true, tags: true, translations: true }
    })
    if (post) {
      const tr = (post.translations as Record<string, Translation> | null) || {}
      title = (locale !== "en" && tr[locale]?.title) || post.title
      tags = post.tags || []
    }
  } catch {
    /* render the generic card on lookup failure */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0b14 0%, #16121f 100%)",
          color: "#fff",
          padding: "72px 80px",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 30,
            letterSpacing: 3,
            color: "#a78bfa",
            fontWeight: 700
          }}
        >
          KALIT BLOG
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 64 : 76,
            fontWeight: 800,
            lineHeight: 1.08,
            maxWidth: 1040,
            letterSpacing: -1
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {tags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "#cbd5e1",
                  border: "1px solid rgba(167,139,250,0.5)",
                  borderRadius: 999,
                  padding: "8px 22px"
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#e2e8f0" }}>kalit.ai/blog</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
