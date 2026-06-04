import { Container } from "@/components/container"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { MetadataSeo } from "@/lib/metadata"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { previewIdea, type IdeaTeaser } from "@/lib/magnet/idea-types"
import { notFound } from "next/navigation"
import { ShareBrief } from "./share-brief"
import s from "../../idea.module.scss"

async function load(shareId: string) {
  const m = await prisma.magnetSession.findUnique({
    where: { shareId },
    select: { id: true, door: true, userId: true, teaser: true },
  })
  if (!m || m.door !== "idea_finder" || !m.teaser) return null
  return { ...m, teaser: m.teaser as unknown as IdeaTeaser }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; shareId: string }> }) {
  const { locale: raw, shareId } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const data = await load(shareId)
  const top = data?.teaser?.ideas?.[0]
  return MetadataSeo({
    fullTitle: top ? `${top.name}: a 2026 startup idea scored by Kalit` : "Startup idea brief by Kalit",
    description: top
      ? `${top.tagline || "A data-backed 2026 opportunity"}. Opportunity score ${top.scores.opportunity}/100. See the market, business model and launch playbook.`
      : "An AI-scored startup idea from Kalit Search. See the market, business model and how to launch.",
    locale,
    pathname: `/idea-finder/i/${shareId}`,
    image: `/api/magnet/idea/og/${shareId}`,
  })
}

export default async function SharedIdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ shareId: string }>
  searchParams: Promise<{ focus?: string }>
}) {
  const { shareId } = await params
  const { focus } = await searchParams
  const data = await load(shareId)
  if (!data) notFound()

  const session = await auth()
  const viewerId = session?.user?.id
  // The owner (or an as-yet-unclaimed teaser) sees the full brief; everyone
  // else gets the gated preview and can sign up to unlock their own.
  const unlocked = !!viewerId && (!data.userId || data.userId === viewerId)
  const ideas = unlocked ? data.teaser.ideas : data.teaser.ideas.map(previewIdea)

  return (
    <Container>
      <section className={s.page}>
        <div className={s.hero} style={{ marginBottom: "2rem" }}>
          <span className={s.kicker}>Found with Kalit Search</span>
          <h1 className={s.title}>
            {unlocked ? "Your idea brief" : "A startup idea worth a look"}
          </h1>
          <p className={s.subtitle}>
            {unlocked
              ? "The market, the business model, and exactly how to launch. Grounded in real demand signals."
              : "Scored from real demand across 25+ sources. Unlock the full brief free, or find one matched to you."}
          </p>
        </div>

        <ShareBrief
          magnetSessionId={data.id}
          shareId={shareId}
          ideas={ideas}
          unlocked={unlocked}
          viewerAuthed={!!viewerId}
          initialFocusId={focus || data.teaser.topProjectId}
        />
      </section>
    </Container>
  )
}
