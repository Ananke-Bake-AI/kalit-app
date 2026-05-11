"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import {
  archiveRepository,
  deleteRepository,
  listRepositories,
  openRepository,
  remixRepository,
  renameRepository,
  setRepositoryVisibility,
  toggleRepositoryStar,
  type RepositoryProject,
} from "@/server/actions/repositories"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import s from "./repositories.module.scss"

type Filter = "all" | "live" | "draft" | "archived"

export function RepositoriesClient({
  initial,
  count,
  cap,
}: {
  initial: RepositoryProject[]
  count: number
  cap: number
}) {
  const [data, setData] = useState(initial)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [includeArchived, setIncludeArchived] = useState(false)
  const [pending, startTransition] = useTransition()

  const refresh = (archivedFlag = includeArchived) => {
    startTransition(async () => {
      const next = await listRepositories(archivedFlag)
      if ("error" in next) {
        toast.error(next.error || "Failed to load")
        return
      }
      setData(next.projects)
    })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((d) => {
      if (filter === "live" && !d.subdomainUrl && !d.vercelUrl) return false
      if (filter === "draft" && (d.subdomainUrl || d.vercelUrl)) return false
      if (filter === "archived" && !d.archivedAt) return false
      if (filter === "all" && d.archivedAt && !includeArchived) return false
      if (!q) return true
      const hay =
        (d.displayName || "") +
        " " +
        (d.title || "") +
        " " +
        (d.subdomain || "") +
        " " +
        (d.prompt || "") +
        " " +
        (d.subdomainUrl || "") +
        " " +
        (d.vercelUrl || "")
      return hay.toLowerCase().includes(q)
    })
  }, [data, search, filter, includeArchived])

  const liveCount = data.filter((d) => d.subdomainUrl || d.vercelUrl).length
  const archivedCount = data.filter((d) => d.archivedAt).length

  // ── Actions ─────────────────────────────────────────────

  const handleOpen = (d: RepositoryProject) => {
    startTransition(async () => {
      const result = await openRepository(d.id)
      if ("error" in result) {
        toast.error(result.error || "Could not open")
        return
      }
      // Hard navigate to /studio?session=<id>; the session JWT flow needs a
      // page reload to refresh.
      window.location.href = `/studio?session=${result.sessionId}`
    })
  }

  const handleRename = (d: RepositoryProject) => {
    const next = window.prompt(
      "Rename repository",
      d.displayName || d.title || "",
    )
    if (next == null) return
    const trimmed = next.trim()
    if (!trimmed) return
    startTransition(async () => {
      const result = await renameRepository(d.id, trimmed)
      if ("error" in result) {
        toast.error(result.error || "Rename failed")
        return
      }
      toast.success("Renamed")
      refresh()
    })
  }

  const handleArchiveToggle = (d: RepositoryProject) => {
    const archive = !d.archivedAt
    startTransition(async () => {
      const result = await archiveRepository(d.id, archive)
      if ("error" in result) {
        toast.error(result.error || "Failed")
        return
      }
      toast.success(archive ? "Archived" : "Restored")
      refresh()
    })
  }

  const handleDelete = (d: RepositoryProject) => {
    const label = d.displayName || d.title || d.id.slice(0, 8)
    if (
      !confirm(
        `Delete "${label}" permanently?\n\nThis will:\n• Remove the live site (Vercel)\n• Delete the Taskforce workspace\n• Drop all DB records\n\nIrreversible.`,
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await deleteRepository(d.id)
      if ("error" in result) {
        toast.error(result.error || "Delete failed")
        return
      }
      const bits: string[] = []
      if (result.vercelDeleted) bits.push("Vercel removed")
      if (result.vercelError) bits.push(`Vercel error: ${result.vercelError}`)
      if (result.subdomainCleared) bits.push("subdomain cleared")
      if (result.taskforceDeleted) bits.push("Taskforce wiped")
      if (result.rowDropped) bits.push("record dropped")
      toast.success(bits.join(" · ") || "Deleted")
      refresh()
    })
  }

  const handleVisit = (d: RepositoryProject) => {
    const url = d.subdomainUrl || d.vercelUrl
    if (!url) {
      toast.error("No live URL — deploy first")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // ── Visibility toggle ──────────────────────────────────
  const handleVisibilityToggle = (d: RepositoryProject) => {
    const next = d.visibility === "public" ? "private" : "public"
    if (next === "public") {
      const url = d.subdomainUrl || d.vercelUrl
      if (!url && d.status !== "completed") {
        toast.error("Deploy first — public projects need a live URL")
        return
      }
    }
    // Optimistic local flip so the badge updates instantly.
    setData((prev) =>
      prev.map((p) => (p.id === d.id ? { ...p, visibility: next } : p)),
    )
    startTransition(async () => {
      const result = await setRepositoryVisibility(d.id, next)
      if ("error" in result) {
        toast.error(result.error || "Visibility update failed")
        // Revert.
        setData((prev) =>
          prev.map((p) =>
            p.id === d.id ? { ...p, visibility: d.visibility } : p,
          ),
        )
        return
      }
      toast.success(next === "public" ? "Project is now public" : "Project is now private")
    })
  }

  // ── Star toggle ────────────────────────────────────────
  const handleStarToggle = (d: RepositoryProject) => {
    // Optimistic update — star icon flip + count tweak before the
    // round-trip lands. Reverted on failure.
    const optimisticDelta = d.viewerStarred ? -1 : 1
    setData((prev) =>
      prev.map((p) =>
        p.id === d.id
          ? { ...p, viewerStarred: !p.viewerStarred, starCount: Math.max(0, p.starCount + optimisticDelta) }
          : p,
      ),
    )
    startTransition(async () => {
      const result = await toggleRepositoryStar(d.id)
      if ("error" in result) {
        toast.error(result.error || "Star failed")
        setData((prev) =>
          prev.map((p) =>
            p.id === d.id
              ? { ...p, viewerStarred: d.viewerStarred, starCount: d.starCount }
              : p,
          ),
        )
        return
      }
      // Reconcile with server values in case of drift.
      setData((prev) =>
        prev.map((p) =>
          p.id === d.id
            ? { ...p, viewerStarred: result.starred, starCount: result.starCount }
            : p,
        ),
      )
    })
  }

  // ── Remix modal state ──────────────────────────────────
  // The remix dialog is global (one at a time) rather than per-card —
  // each card opens it via its repaint button. We keep the source
  // project ref + the user's optional idea string here.
  const [remixTarget, setRemixTarget] = useState<RepositoryProject | null>(null)
  const [remixIdea, setRemixIdea] = useState("")

  const handleRemixSubmit = (mode: "auto" | "withIdea") => {
    if (!remixTarget) return
    const target = remixTarget
    const idea = mode === "withIdea" ? remixIdea.trim() : ""
    if (mode === "withIdea" && !idea) {
      toast.error("Add some direction or pick automatic")
      return
    }
    setRemixTarget(null)
    setRemixIdea("")
    startTransition(async () => {
      const t = toast.loading("Forking project on Taskforce…")
      const result = await remixRepository(target.id, idea || undefined)
      toast.dismiss(t)
      if ("error" in result) {
        toast.error(result.error || "Remix failed")
        return
      }
      // Stay on /repositories briefly for the "Remixing…" toast, then
      // hard-navigate so the studio JWT/session bootstrap fires fresh.
      // The `prompt` query param triggers the studio's auto-send path.
      const url = `/studio?session=${result.sessionId}&prompt=${encodeURIComponent(result.prompt)}`
      toast.success("Remix launched — opening studio")
      window.location.href = url
    })
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className={s.page}>
      <SurfacePanel
        spaced
        title="My repositories"
        subtitle={`${count} of ${cap} projects · ${liveCount} live · ${archivedCount} archived`}
        headerAside={
          <div className={s.headerActions}>
            <TextField
              placeholder="Search by title, prompt, URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.search}
            />
          </div>
        }
      >
        <div className={s.filters}>
          {(["all", "live", "draft", "archived"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={filter === f ? s.filterActive : s.filterBtn}
              onClick={() => {
                setFilter(f)
                if (f === "archived" && !includeArchived) {
                  setIncludeArchived(true)
                  refresh(true)
                }
              }}
            >
              {f === "all"
                ? `All (${data.length})`
                : f === "live"
                  ? `Live (${liveCount})`
                  : f === "draft"
                    ? `Draft (${data.length - liveCount})`
                    : `Archived (${archivedCount})`}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className={s.empty}>
            <Icon icon="hugeicons:folder-cloud" />
            <p>
              {search
                ? "No project matches your search."
                : filter === "archived"
                  ? "No archived projects."
                  : "You haven't built anything yet — head to the Studio to start."}
            </p>
            {!search && filter !== "archived" && (
              <Button href="/studio">Open studio</Button>
            )}
          </div>
        ) : (
          <div className={s.grid}>
            {visible.map((d) => (
              <RepoCard
                key={d.id}
                d={d}
                pending={pending}
                onOpen={() => handleOpen(d)}
                onVisit={() => handleVisit(d)}
                onRename={() => handleRename(d)}
                onArchive={() => handleArchiveToggle(d)}
                onDelete={() => handleDelete(d)}
                onRemix={() => {
                  setRemixIdea("")
                  setRemixTarget(d)
                }}
                onStar={() => handleStarToggle(d)}
                onVisibilityToggle={() => handleVisibilityToggle(d)}
              />
            ))}
          </div>
        )}
      </SurfacePanel>

      {remixTarget && (
        <RemixModal
          target={remixTarget}
          idea={remixIdea}
          setIdea={setRemixIdea}
          onCancel={() => {
            setRemixTarget(null)
            setRemixIdea("")
          }}
          onSubmit={handleRemixSubmit}
          pending={pending}
        />
      )}
    </div>
  )
}

function RepoCard({
  d,
  pending,
  onOpen,
  onVisit,
  onRename,
  onArchive,
  onDelete,
  onRemix,
  onStar,
  onVisibilityToggle,
}: {
  d: RepositoryProject
  pending: boolean
  onOpen: () => void
  onVisit: () => void
  onRename: () => void
  onArchive: () => void
  onDelete: () => void
  onRemix: () => void
  onStar: () => void
  onVisibilityToggle: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const url = d.subdomainUrl || d.vercelUrl
  const label = d.displayName || d.title || "(untitled)"
  const deployed = d.subdomainDeployedAt || d.vercelDeployedAt
  const statusBadge =
    d.archivedAt ? "archived"
      : url ? "live"
        : d.status === "failed" ? "failed"
          : "draft"

  return (
    <div className={`${s.card} ${d.archivedAt ? s.cardArchived : ""}`}>
      <div className={s.thumb}>
        {d.hasThumbnail ? (
          <img
            src={`/api/broker/projects/${d.id}/thumbnail.png`}
            alt={label}
            loading="lazy"
          />
        ) : (
          <div className={s.thumbPlaceholder}>
            <Icon icon="hugeicons:folder-cloud" />
          </div>
        )}
        <div className={s.thumbBadge}>
          <Badge
            variant={
              statusBadge === "live" ? "success" : undefined
            }
          >
            {statusBadge}
          </Badge>
        </div>
        {d.visibility === "public" && (
          <div className={s.visibilityBadge} title="This project is public on /discover">
            <Icon icon="hugeicons:globe-02" />
            <span>public</span>
          </div>
        )}
      </div>
      <div className={s.body}>
        <div className={s.titleRow}>
          <div className={s.title}>{label}</div>
          <button
            type="button"
            className={`${s.starBtn} ${d.viewerStarred ? s.starBtnActive : ""}`}
            onClick={onStar}
            disabled={pending}
            title={d.viewerStarred ? "Unstar this project" : "Star this project"}
          >
            <Icon icon={d.viewerStarred ? "hugeicons:star" : "hugeicons:star"} />
            <span>{d.starCount}</span>
          </button>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={s.urlLink}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon icon="hugeicons:link-square-02" />
            {url.replace(/^https?:\/\//, "")}
          </a>
        )}
        {deployed && (
          <div className={s.meta}>
            Deployed {new Date(deployed).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className={s.actions}>
        <Button
          variant="primary"
          onClick={onOpen}
          disabled={pending}
          className={s.openBtn}
        >
          Open
        </Button>
        <button
          type="button"
          className={s.iconBtn}
          onClick={onRemix}
          title="Remix this project — fork on Taskforce and run a fresh sprint"
          disabled={pending || !d.subdomainUrl && !d.vercelUrl && d.status !== "completed"}
        >
          <Icon icon="hugeicons:paint-board" />
        </button>
        {url && (
          <button
            type="button"
            className={s.iconBtn}
            onClick={onVisit}
            title="Visit live site"
          >
            <Icon icon="hugeicons:link-square-02" />
          </button>
        )}
        <CardMenu
          archived={!!d.archivedAt}
          isPublic={d.visibility === "public"}
          canPublish={!!url || d.status === "completed"}
          onRename={onRename}
          onArchive={onArchive}
          onDelete={onDelete}
          onVisibilityToggle={onVisibilityToggle}
        />
      </div>
    </div>
  )
}

// CardMenu portals its dropdown to document.body so the parent card's
// overflow:hidden (used to round-corner the thumbnail) doesn't clip the
// menu out of view. Position is computed from the trigger button's
// bounding rect each time the menu opens.
function CardMenu({
  archived,
  isPublic,
  canPublish,
  onRename,
  onArchive,
  onDelete,
  onVisibilityToggle,
}: {
  archived: boolean
  isPublic: boolean
  canPublish: boolean
  onRename: () => void
  onArchive: () => void
  onDelete: () => void
  onVisibilityToggle: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 160
    // Right-align the menu under the button. Clamp to the viewport.
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8))
    setPos({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScroll = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={s.iconBtn}
        onClick={() => setOpen((v) => !v)}
        title="More"
      >
        <Icon icon="hugeicons:more-horizontal-circle-01" />
      </button>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className={s.menuOverlay} onClick={() => setOpen(false)} />
            <div
              className={s.menu}
              role="menu"
              style={{ top: pos.top, left: pos.left, width: 160 }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onRename()
                }}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onArchive()
                }}
              >
                {archived ? "Restore" : "Archive"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onVisibilityToggle()
                }}
                disabled={!isPublic && !canPublish}
                title={
                  !isPublic && !canPublish
                    ? "Deploy first to publish"
                    : isPublic
                      ? "Hide from /discover"
                      : "Publish to /discover"
                }
              >
                {isPublic ? "Make private" : "Publish public"}
              </button>
              <button
                type="button"
                className={s.menuDanger}
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
              >
                Delete…
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}

// RemixModal renders the two-mode picker (auto / with idea) and gathers
// the optional direction text. Portal'd so the page's overflow doesn't
// clip it; basic centered overlay with click-outside-cancel.
function RemixModal({
  target,
  idea,
  setIdea,
  onCancel,
  onSubmit,
  pending,
}: {
  target: RepositoryProject
  idea: string
  setIdea: (v: string) => void
  onCancel: () => void
  onSubmit: (mode: "auto" | "withIdea") => void
  pending: boolean
}) {
  const label = target.displayName || target.title || "(untitled)"
  if (typeof document === "undefined") return null
  return createPortal(
    <div className={s.remixOverlay} onClick={onCancel}>
      <div
        className={s.remixModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remix-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.remixHeader}>
          <Icon icon="hugeicons:paint-board" />
          <h3 id="remix-title">Remix « {label} »</h3>
        </div>
        <p className={s.remixIntro}>
          Crée un nouveau projet à partir de celui-ci. Une copie indépendante
          est faite côté Taskforce — l'original reste intact.
        </p>

        <div className={s.remixOptions}>
          <button
            type="button"
            className={s.remixOptionPrimary}
            disabled={pending}
            onClick={() => onSubmit("auto")}
          >
            <Icon icon="hugeicons:magic-wand-01" />
            <span>
              <strong>Remix automatique</strong>
              <em>L'agent réinvente librement</em>
            </span>
          </button>

          <div className={s.remixDivider}>
            <span>ou</span>
          </div>

          <label className={s.remixIdeaLabel} htmlFor="remix-idea">
            Donne une direction à l'agent
          </label>
          <textarea
            id="remix-idea"
            className={s.remixTextarea}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Ex : passe en thème dark luxury, target une cible Gen Z, change le wording pour viser le B2B…"
            rows={5}
            maxLength={2000}
            autoFocus
          />
          <button
            type="button"
            className={s.remixOptionSecondary}
            disabled={pending || !idea.trim()}
            onClick={() => onSubmit("withIdea")}
          >
            <Icon icon="hugeicons:rocket-01" />
            <span>Lancer le remix avec ma direction</span>
          </button>
        </div>

        <button
          type="button"
          className={s.remixCancel}
          onClick={onCancel}
          disabled={pending}
        >
          Annuler
        </button>
      </div>
    </div>,
    document.body,
  )
}
