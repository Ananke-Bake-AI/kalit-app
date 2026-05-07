"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import {
  getAdminFeaturedProjects,
  setProjectFeatured,
} from "@/server/actions/admin"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./featured-projects.module.scss"

type Row = {
  id: string
  title: string
  displayName: string
  featuredTitle: string
  featuredSubtitle: string
  url: string
  hasThumbnail: boolean
  featuredAt: string | null
}

export function FeaturedProjectsClient({ initial }: { initial: Row[] }) {
  const [data, setData] = useState(initial)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "featured" | "candidates">("all")
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)

  const refresh = () => {
    startTransition(async () => {
      const next = await getAdminFeaturedProjects()
      if ("error" in next) {
        toast.error(next.error || "Reload failed")
        return
      }
      setData(next.projects)
    })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((d) => {
      if (filter === "featured" && !d.featuredAt) return false
      if (filter === "candidates" && d.featuredAt) return false
      if (!q) return true
      return (
        d.title.toLowerCase().includes(q) ||
        d.displayName.toLowerCase().includes(q) ||
        d.featuredTitle.toLowerCase().includes(q) ||
        d.url.toLowerCase().includes(q)
      )
    })
  }, [data, search, filter])

  const featuredCount = data.filter((d) => d.featuredAt).length

  const handleToggle = async (d: Row) => {
    const willFeature = !d.featuredAt
    if (willFeature) {
      if (
        !confirm(
          `Make "${d.featuredTitle || d.displayName || d.title}" public on kalit.ai homepage?\n\nThe live URL will be exposed in the "Made with Kalit" section.`,
        )
      ) {
        return
      }
    }
    startTransition(async () => {
      const result = await setProjectFeatured(d.id, { featured: willFeature })
      if ("error" in result) {
        toast.error(result.error || "Failed")
        return
      }
      toast.success(willFeature ? "Now featured" : "Removed from featured")
      refresh()
    })
  }

  const saveEdit = (d: Row, title: string, subtitle: string) => {
    startTransition(async () => {
      const result = await setProjectFeatured(d.id, {
        featuredTitle: title,
        featuredSubtitle: subtitle,
      })
      if ("error" in result) {
        toast.error(result.error || "Failed")
        return
      }
      toast.success("Saved")
      setEditingId(null)
      refresh()
    })
  }

  return (
    <SurfacePanel
      spaced
      title="Featured projects"
      subtitle={`${featuredCount} featured · ${data.length} total deployed`}
      headerAside={
        <TextField
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={s.search}
        />
      }
    >
      <div className={s.filters}>
        {(["all", "featured", "candidates"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? s.filterActive : s.filterBtn}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${data.length})`
              : f === "featured"
                ? `Featured (${featuredCount})`
                : `Candidates (${data.length - featuredCount})`}
          </button>
        ))}
      </div>

      <div className={s.list}>
        {visible.map((d) => (
          <div key={d.id} className={s.row}>
            <div className={s.thumb}>
              {d.hasThumbnail ? (
                <img
                  src={`/api/broker/projects/${d.id}/thumbnail.png`}
                  alt={d.displayName || d.title}
                  loading="lazy"
                />
              ) : (
                <div className={s.thumbPlaceholder}>
                  <Icon icon="hugeicons:folder-cloud" />
                </div>
              )}
            </div>
            <div className={s.body}>
              <div className={s.titleLine}>
                <strong>{d.displayName || d.title || "(untitled)"}</strong>
                {d.featuredAt && <Badge variant="success">featured</Badge>}
              </div>
              <a href={d.url} target="_blank" rel="noreferrer" className={s.url}>
                <Icon icon="hugeicons:link-square-02" /> {d.url.replace(/^https?:\/\//, "")}
              </a>
              {editingId === d.id ? (
                <FeaturedEdit
                  initialTitle={d.featuredTitle || d.displayName || d.title || ""}
                  initialSubtitle={d.featuredSubtitle}
                  onCancel={() => setEditingId(null)}
                  onSave={(t, st) => saveEdit(d, t, st)}
                  pending={pending}
                />
              ) : (
                d.featuredAt && (
                  <div className={s.featuredCopy}>
                    <div className={s.featuredTitle}>
                      {d.featuredTitle || <em>(no override — uses project title)</em>}
                    </div>
                    {d.featuredSubtitle && (
                      <div className={s.featuredSubtitle}>{d.featuredSubtitle}</div>
                    )}
                  </div>
                )
              )}
            </div>
            <div className={s.actions}>
              <Button
                variant="secondary"
                onClick={() => handleToggle(d)}
                disabled={pending}
              >
                {d.featuredAt ? "Unfeature" : "Feature"}
              </Button>
              {d.featuredAt && editingId !== d.id && (
                <Button
                  variant="tertiary"
                  onClick={() => setEditingId(d.id)}
                  disabled={pending}
                >
                  Edit copy
                </Button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className={s.empty}>No projects match this filter.</div>
        )}
      </div>
    </SurfacePanel>
  )
}

function FeaturedEdit({
  initialTitle,
  initialSubtitle,
  onCancel,
  onSave,
  pending,
}: {
  initialTitle: string
  initialSubtitle: string
  onCancel: () => void
  onSave: (title: string, subtitle: string) => void
  pending: boolean
}) {
  const [title, setTitle] = useState(initialTitle)
  const [subtitle, setSubtitle] = useState(initialSubtitle)
  return (
    <div className={s.editForm}>
      <input
        type="text"
        placeholder="Featured title (max 80 chars)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <textarea
        placeholder="Tagline (max 200 chars, optional)"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        maxLength={200}
        rows={2}
      />
      <div className={s.editActions}>
        <Button variant="secondary" onClick={() => onSave(title, subtitle)} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="tertiary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
