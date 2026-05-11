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

// Curated by /admin/featured-projects, served by the broker at
// /api/broker/featured-projects. Five slots are tuned to the GSAP
// rotation timing below — when the admin promotes fewer than five we
// fill the remaining slots with empty screens so the carousel cadence
// stays consistent.
const CAROUSEL_SLOTS = 5

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
  const carouselRef = useRef<HTMLDivElement | null>(null)

  // Fetch admin-curated featured projects. Failure / empty list falls
  // back to placeholder screens so the carousel still renders.
  const [featured, setFeatured] = useState<FeaturedProject[]>([])
  useEffect(() => {
    let cancelled = false
    fetch("/api/broker/featured-projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        if (cancelled) return
        const list: FeaturedProject[] = Array.isArray(data?.projects) ? data.projects : []
        setFeatured(list.slice(0, CAROUSEL_SLOTS))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Pad the slot list so we always render CAROUSEL_SLOTS cards. Empty
  // slots keep the rotation cadence the GSAP timing was tuned around.
  const slots: (FeaturedProject | null)[] = Array.from({ length: CAROUSEL_SLOTS }, (_, i) => featured[i] ?? null)

  useGSAP(
    () => {
      const root = carouselRef.current
      if (!root) return

      const projects = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-project]"))
      const totalProjects = projects.length
      if (!totalProjects) return

      const delayBetweenProjects = 2.5
      const duration = 12

      projects.forEach((project, index) => {
        gsap.fromTo(
          project,
          { rotation: 40 },
          {
            rotation: -40,
            duration,
            ease: "none",
            repeat: -1,
            delay: index * delayBetweenProjects,
            repeatDelay: delayBetweenProjects * totalProjects - duration
          }
        )
      })
    },
    { scope: carouselRef, dependencies: [featured.length] }
  )

  return (
    <section className={clsx(s.portfolio, className)}>
      <Container>
        <Heading className={s.heading} subtitle={subtitle} paragraph={paragraph} tag="h2">
          {heading}
        </Heading>
        <div ref={carouselRef} className={s.carousel}>
          {slots.map((proj, index) => (
            <div className={s.project} data-project key={proj?.id ?? `placeholder-${index}`}>
              {proj ? (
                <a
                  href={proj.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={s.screen}
                  aria-label={proj.title}
                  title={proj.title}
                >
                  {proj.hasThumbnail && (
                    <img
                      src={`/api/broker/featured/${proj.id}/thumbnail.png`}
                      alt={proj.title}
                      loading="lazy"
                    />
                  )}
                </a>
              ) : (
                <div className={s.screen} />
              )}
            </div>
          ))}
        </div>
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
