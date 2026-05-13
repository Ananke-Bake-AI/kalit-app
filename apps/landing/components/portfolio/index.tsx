"use client"

import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { type ReactNode, useEffect, useRef, useState } from "react"

import { FlowSuiteCtaButton } from "@/components/flow-suite-cta-button"
import { FLOW_MARKETING_PATH } from "@/lib/flow-suite-entry"
import type { SuiteId } from "@/lib/suites"
import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import s from "./portfolio.module.scss"

interface FeaturedProject {
  id: string
  title: string
  subtitle: string
  url: string
  hasThumbnail: boolean
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// Pad the marquee with placeholders below this count so the track stays
// wide enough to fill the viewport when few projects are featured.
const MIN_CARDS = 6

export interface PortfolioProps {
  subtitle: string
  heading: ReactNode
  paragraph: ReactNode
  buttonText: string
  /** Lien marketing (home, etc.) — ignoré si `suiteAppUrl` est défini */
  link?: string
  /** Si défini : connecté → app suite, sinon → login avec retour Flow */
  suiteAppUrl?: string
  /** Suite ciblée pour le SSO (requis si `suiteAppUrl` est défini). */
  suiteId?: SuiteId
  /** Page marketing pour le callback login (ex. `/pentest`). */
  marketingPath?: string
  className?: string
}

export function Portfolio({
  subtitle,
  heading,
  paragraph,
  buttonText,
  link,
  suiteAppUrl,
  suiteId,
  marketingPath = FLOW_MARKETING_PATH,
  className
}: PortfolioProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)

  // Fetch admin-curated featured projects. Failure / empty list still
  // renders the placeholder marquee.
  const [featured, setFeatured] = useState<FeaturedProject[]>([])
  useEffect(() => {
    let cancelled = false
    fetch("/api/broker/featured-projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        if (cancelled) return
        const list: FeaturedProject[] = Array.isArray(data?.projects) ? data.projects : []
        setFeatured(list)
        // Warm the browser cache for every thumbnail up front so no card
        // ever reveals a gray placeholder as it scrolls into view.
        list.forEach((p) => {
          if (!p.hasThumbnail) return
          const img = new window.Image()
          img.src = `/api/broker/featured/${p.id}/thumbnail.png`
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const padded: (FeaturedProject | null)[] = [...featured]
  while (padded.length < MIN_CARDS) padded.push(null)
  // Duplicate the list so the loop's seam is hidden — when the track
  // translates by -50% of its width, the second copy is already aligned
  // exactly where the first one started.
  const loop = [...padded, ...padded]

  useGSAP(
    () => {
      const track = trackRef.current
      if (!track) return
      const totalWidth = track.scrollWidth
      if (!totalWidth) return
      // ~60px/sec — fast enough to feel alive, slow enough to read each card.
      const duration = totalWidth / 2 / 60
      gsap.fromTo(
        track,
        { x: 0 },
        {
          x: -totalWidth / 2,
          duration,
          ease: "none",
          repeat: -1,
        }
      )
    },
    { scope: trackRef, dependencies: [featured.length] }
  )

  return (
    <section className={clsx(s.portfolio, className)}>
      <Container>
        <Heading className={s.heading} subtitle={subtitle} paragraph={paragraph} tag="h2">
          {heading}
        </Heading>
      </Container>
      <div className={s.marquee}>
        <div ref={trackRef} className={s.track}>
          {loop.map((proj, index) => (
            <div className={s.project} key={`${proj?.id ?? "placeholder"}-${index}`}>
              {proj ? (
                <a
                  href={proj.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={s.screen}
                  aria-label={proj.title || proj.url}
                  title={proj.title || proj.url}
                >
                  {proj.hasThumbnail ? (
                    <img
                      src={`/api/broker/featured/${proj.id}/thumbnail.png`}
                      alt={proj.title}
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    /* Thumbnail not yet captured (broker queue mid-flight,
                       or a fresh deploy without screenshot) — fall back to
                       a labelled gradient tile so the card stays meaningful
                       instead of going blank. Click still navigates to the
                       live site. */
                    <div className={s.fallback}>
                      <span className={s.fallbackHost}>{hostnameOf(proj.url)}</span>
                      <span className={s.fallbackTitle}>{proj.title || hostnameOf(proj.url)}</span>
                      <span className={s.fallbackHint}>Open site →</span>
                    </div>
                  )}
                </a>
              ) : (
                <div className={s.screen} />
              )}
            </div>
          ))}
        </div>
      </div>
      <Container>
        {suiteAppUrl && suiteId ? (
          <FlowSuiteCtaButton suiteId={suiteId} suiteAppUrl={suiteAppUrl} marketingPath={marketingPath} className={s.btn} circle>
            {buttonText}
          </FlowSuiteCtaButton>
        ) : (
          <Button className={s.btn} circle href={link ?? "/"}>
            {buttonText}
          </Button>
        )}
      </Container>
    </section>
  )
}

Portfolio.displayName = "Portfolio"
