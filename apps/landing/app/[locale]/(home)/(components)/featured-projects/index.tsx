"use client"

import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { useEffect, useState } from "react"
import s from "./featured-projects.module.scss"

interface FeaturedProject {
  id: string
  title: string
  subtitle: string
  url: string
  hasThumbnail: boolean
}

const BROKER_URL = (() => {
  // Build-time env (Next inlines NEXT_PUBLIC_* at compile). Falls back
  // to the same-origin /api/broker rewrite (next.config rewrites
  // /api/broker/:path* → broker /api/flow/:path*) so we never expose
  // the raw broker URL to the public landing.
  if (typeof window === "undefined") return ""
  return ""
})()

export function FeaturedProjects() {
  const [projects, setProjects] = useState<FeaturedProject[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/broker/featured-projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        if (cancelled) return
        setProjects(Array.isArray(data?.projects) ? data.projects : [])
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded || projects.length === 0) return null

  return (
    <section className={s.section}>
      <Container>
        <div className={s.heading}>
          <h2>Made with Kalit</h2>
          <p>Real sites built and shipped from a single chat with the agent.</p>
        </div>
        <div className={s.grid}>
          {projects.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer noopener"
              className={s.card}
            >
              <div className={s.thumb}>
                {p.hasThumbnail ? (
                  <img
                    src={`/api/broker/featured/${p.id}/thumbnail.png`}
                    alt={p.title}
                    loading="lazy"
                  />
                ) : (
                  <div className={s.thumbPlaceholder}>
                    <Icon icon="hugeicons:link-square-02" />
                  </div>
                )}
              </div>
              <div className={s.body}>
                <div className={s.title}>{p.title}</div>
                {p.subtitle && <div className={s.subtitle}>{p.subtitle}</div>}
                <div className={s.host}>
                  {p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </div>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </section>
  )
}
