"use client"

import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import {
  remixRepository,
  toggleRepositoryStar,
  useTemplateFromRepository,
} from "@/server/actions/repositories"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./discover.module.scss"

interface PublicProject {
  id: string
  title: string
  displayName?: string
  subtitle?: string
  url: string
  hasThumbnail: boolean
  starCount: number
  viewerStarred: boolean
  projectType: string
  publishedAt?: string | null
  owner: {
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

type Sort = "stars" | "recent"

export function DiscoverClient() {
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [sort, setSort] = useState<Sort>("stars")
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/broker/discover?sort=${sort}&page=0`)
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        if (cancelled) return
        setProjects(Array.isArray(data?.projects) ? data.projects : [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sort])

  const handleStar = (p: PublicProject) => {
    const delta = p.viewerStarred ? -1 : 1
    setProjects((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, viewerStarred: !x.viewerStarred, starCount: Math.max(0, x.starCount + delta) }
          : x,
      ),
    )
    startTransition(async () => {
      const result = await toggleRepositoryStar(p.id)
      if ("error" in result) {
        // Likely "Not authenticated" — anonymous viewers must sign in.
        toast.error(result.error.includes("auth") ? "Sign in to star projects" : result.error)
        setProjects((prev) =>
          prev.map((x) =>
            x.id === p.id
              ? { ...x, viewerStarred: p.viewerStarred, starCount: p.starCount }
              : x,
          ),
        )
        return
      }
      setProjects((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? { ...x, viewerStarred: result.starred, starCount: result.starCount }
            : x,
        ),
      )
    })
  }

  const handleRemix = (p: PublicProject) => {
    startTransition(async () => {
      const t = toast.loading("Forking on Taskforce…")
      const result = await remixRepository(p.id)
      toast.dismiss(t)
      if ("error" in result) {
        toast.error(result.error.includes("auth") ? "Sign in to remix" : result.error)
        return
      }
      toast.success("Remix launched — opening studio")
      window.location.href = `/studio?session=${result.sessionId}&prompt=${encodeURIComponent(result.prompt)}`
    })
  }

  const handleUseTemplate = (p: PublicProject) => {
    startTransition(async () => {
      const t = toast.loading("Copying template…")
      const result = await useTemplateFromRepository(p.id)
      toast.dismiss(t)
      if ("error" in result) {
        toast.error(result.error.includes("auth") ? "Sign in to use templates" : result.error)
        return
      }
      toast.success("Template ready — opening studio")
      // Same auto-send hook as remix: the studio reads the prompt query
      // param and fires it on first paint. Difference is purely in the
      // canned brief (template asks the user, remix runs a sprint).
      window.location.href = `/studio?session=${result.sessionId}&prompt=${encodeURIComponent(result.prompt)}`
    })
  }

  return (
    <section className={s.page}>
      <Container>
        <header className={s.header}>
          <h1>Discover</h1>
          <p>Public projects shipped from a single chat with the agent. Star the ones you like, remix any of them.</p>
        </header>

        <div className={s.filters}>
          <button
            type="button"
            className={sort === "stars" ? s.filterActive : s.filterBtn}
            onClick={() => setSort("stars")}
          >
            <Icon icon="hugeicons:star" />
            Most starred
          </button>
          <button
            type="button"
            className={sort === "recent" ? s.filterActive : s.filterBtn}
            onClick={() => setSort("recent")}
          >
            <Icon icon="hugeicons:clock-01" />
            Recently published
          </button>
        </div>

        {loading ? (
          <div className={s.empty}>Loading…</div>
        ) : projects.length === 0 ? (
          <div className={s.empty}>
            <Icon icon="hugeicons:folder-cloud" />
            <p>No public projects yet — be the first to publish from /repositories.</p>
          </div>
        ) : (
          <div className={s.grid}>
            {projects.map((p) => (
              <article key={p.id} className={s.card}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={s.thumb}
                >
                  {p.hasThumbnail ? (
                    <img
                      src={`/api/broker/projects/${p.id}/thumbnail.png`}
                      alt={p.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className={s.thumbPlaceholder}>
                      <Icon icon="hugeicons:folder-cloud" />
                    </div>
                  )}
                </a>
                <div className={s.body}>
                  <div className={s.titleRow}>
                    <h3 className={s.title}>{p.title}</h3>
                    <button
                      type="button"
                      className={`${s.starBtn} ${p.viewerStarred ? s.starBtnActive : ""}`}
                      onClick={() => handleStar(p)}
                      disabled={pending}
                      title={p.viewerStarred ? "Unstar" : "Star"}
                    >
                      <Icon icon="hugeicons:star" />
                      <span>{p.starCount}</span>
                    </button>
                  </div>
                  {p.subtitle && <p className={s.subtitle}>{p.subtitle}</p>}
                  <div className={s.footer}>
                    <a
                      href={`/u/${p.owner.username}`}
                      className={s.owner}
                      title={p.owner.displayName || p.owner.username}
                    >
                      {p.owner.avatarUrl ? (
                        <img src={p.owner.avatarUrl} alt="" />
                      ) : (
                        <span className={s.ownerInitial}>
                          {(p.owner.username || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>@{p.owner.username}</span>
                    </a>
                    <div className={s.actions}>
                      <button
                        type="button"
                        className={s.templateBtn}
                        onClick={() => handleUseTemplate(p)}
                        disabled={pending}
                        title="Copy this project as a template — the agent will ask you what to customize"
                      >
                        <Icon icon="hugeicons:copy-01" />
                        Use template
                      </button>
                      <button
                        type="button"
                        className={s.remixBtn}
                        onClick={() => handleRemix(p)}
                        disabled={pending}
                        title="Remix this project — the agent reinvents it on its own"
                      >
                        <Icon icon="hugeicons:paint-board" />
                        Remix
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
