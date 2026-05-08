"use client"

import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import {
  remixRepository,
  toggleRepositoryStar,
} from "@/server/actions/repositories"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./profile.module.scss"

interface PublicProject {
  id: string
  title: string
  subtitle?: string
  url: string
  hasThumbnail: boolean
  starCount: number
  viewerStarred: boolean
  publishedAt?: string | null
  owner: { username: string; displayName?: string; avatarUrl?: string }
}

interface ProfileResponse {
  profile: { username: string; displayName?: string; avatarUrl?: string }
  projects: PublicProject[]
  totalStars: number
}

export function ProfileClient({ username }: { username: string }) {
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/broker/users/${encodeURIComponent(username)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [username])

  const handleStar = (p: PublicProject) => {
    if (!data) return
    const delta = p.viewerStarred ? -1 : 1
    setData({
      ...data,
      projects: data.projects.map((x) =>
        x.id === p.id
          ? { ...x, viewerStarred: !x.viewerStarred, starCount: Math.max(0, x.starCount + delta) }
          : x,
      ),
    })
    startTransition(async () => {
      const result = await toggleRepositoryStar(p.id)
      if ("error" in result) {
        toast.error(result.error.includes("auth") ? "Sign in to star projects" : result.error)
        return
      }
      setData((cur) =>
        cur
          ? {
              ...cur,
              projects: cur.projects.map((x) =>
                x.id === p.id
                  ? { ...x, viewerStarred: result.starred, starCount: result.starCount }
                  : x,
              ),
            }
          : cur,
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
      toast.success("Remix launched")
      window.location.href = `/studio?session=${result.sessionId}&prompt=${encodeURIComponent(result.prompt)}`
    })
  }

  if (loading) {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.loading}>Loading…</div>
        </Container>
      </section>
    )
  }
  if (!data) {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.notFound}>
            <Icon icon="hugeicons:user-question-01" />
            <h1>User not found</h1>
            <p>@{username} hasn't published any project yet, or the username is wrong.</p>
            <a href="/discover" className={s.backLink}>
              <Icon icon="hugeicons:arrow-left-02" />
              Browse public projects
            </a>
          </div>
        </Container>
      </section>
    )
  }

  const { profile, projects, totalStars } = data
  return (
    <section className={s.page}>
      <Container>
        <header className={s.header}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className={s.avatar} />
          ) : (
            <span className={s.avatarFallback}>
              {(profile.username || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className={s.identity}>
            <h1>{profile.displayName || profile.username}</h1>
            <div className={s.subline}>@{profile.username}</div>
            <div className={s.stats}>
              <span>
                <Icon icon="hugeicons:folder-cloud" /> {projects.length} public project
                {projects.length === 1 ? "" : "s"}
              </span>
              <span>
                <Icon icon="hugeicons:star" /> {totalStars} star{totalStars === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className={s.empty}>
            <Icon icon="hugeicons:folder-cloud" />
            <p>No public projects yet.</p>
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
                    >
                      <Icon icon="hugeicons:star" />
                      <span>{p.starCount}</span>
                    </button>
                  </div>
                  {p.subtitle && <p className={s.subtitle}>{p.subtitle}</p>}
                  <div className={s.actions}>
                    <button
                      type="button"
                      className={s.remixBtn}
                      onClick={() => handleRemix(p)}
                      disabled={pending}
                    >
                      <Icon icon="hugeicons:paint-board" />
                      Remix
                    </button>
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
