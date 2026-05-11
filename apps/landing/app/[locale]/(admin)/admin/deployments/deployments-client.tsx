"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import { getDeployments, teardownAllOrphans, teardownDeployment } from "@/server/actions/admin"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./deployments.module.scss"

type Deployment = Awaited<ReturnType<typeof getDeployments>>[number]

type Filter = "all" | "orphaned" | "linked" | "vercel" | "subdomain"

export function DeploymentsClient({ initialData }: { initialData: Deployment[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const refresh = () => {
    startTransition(async () => {
      const next = await getDeployments()
      setData(next)
    })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((d) => {
      if (filter === "orphaned" && !d.isOrphaned) return false
      if (filter === "linked" && d.isOrphaned) return false
      if (filter === "vercel" && !d.vercelProjectName) return false
      if (filter === "subdomain" && !d.subdomain) return false
      if (!q) return true
      return (
        d.vercelProjectName?.toLowerCase().includes(q) ||
        d.subdomain?.toLowerCase().includes(q) ||
        d.vercelUrl?.toLowerCase().includes(q) ||
        d.title?.toLowerCase().includes(q) ||
        d.userEmail?.toLowerCase().includes(q)
      )
    })
  }, [data, search, filter])

  const orphanCount = data.filter((d) => d.isOrphaned).length
  // vercel_project_name is COALESCEd to `flow-<subdomain>` server-side, so
  // every row with a subdomain is now treated as Vercel-backed (matches the
  // real prod deploy convention).
  const vercelCount = data.filter((d) => d.vercelProjectName).length

  const handleRemoveAllOrphans = () => {
    if (orphanCount === 0) return
    if (
      !confirm(
        `This will remove ${orphanCount} orphaned deployment${orphanCount === 1 ? "" : "s"}:\n\n• DELETE every Vercel project owned by them\n• DROP every flow_projects row\n\nIrreversible. Continue?`,
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await teardownAllOrphans()
      if ("error" in result) {
        toast.error(result.error || "Bulk teardown failed")
        return
      }
      const summary = `${result.rowsDropped}/${result.orphans} dropped · Vercel OK ${result.vercelOK}, fail ${result.vercelFail}`
      if (result.vercelFail > 0) {
        toast.error(`${summary}${result.lastError ? ` — last: ${result.lastError}` : ""}`)
      } else {
        toast.success(summary)
      }
      refresh()
    })
  }

  const handleTeardown = async (d: Deployment, dropRow = true) => {
    const targets: string[] = []
    if (d.vercelProjectName) targets.push(`Vercel project "${d.vercelProjectName}" (live site retracted)`)
    if (d.subdomain) targets.push(`subdomain "${d.subdomain}.flow.kalit.ai" record (CF Pages binding stays — known gap, manual CF cleanup needed)`)
    targets.push("the flow_projects database record")
    if (!confirm(`This will remove:\n\n• ${targets.join("\n• ")}\n\nIrreversible. Continue?`)) {
      return
    }
    setPendingId(d.id)
    startTransition(async () => {
      const result = await teardownDeployment(d.id, { dropRow })
      setPendingId(null)
      if ("error" in result) {
        toast.error(result.error || "Teardown failed")
        return
      }
      const bits: string[] = []
      if (result.vercelDeleted) bits.push("Vercel project removed")
      if (result.vercelError) bits.push(`Vercel error: ${result.vercelError}`)
      if (result.subdomainCleared) bits.push("subdomain cleared")
      if (result.rowDropped) bits.push("record dropped")
      toast.success(bits.join(" · ") || "Done")
      refresh()
    })
  }

  return (
    <SurfacePanel
      spaced
      title="Live deployments"
      subtitle={`${data.length} total · ${vercelCount} on Vercel · ${orphanCount} orphaned (no owning session)`}
      headerAside={
        <div className={s.headerActions}>
          {orphanCount > 0 && (
            <Button
              variant="secondary"
              onClick={handleRemoveAllOrphans}
              disabled={pending}
              className={s.deleteBtn}
            >
              {pending ? "Removing…" : `Remove all ${orphanCount} orphan${orphanCount === 1 ? "" : "s"}`}
            </Button>
          )}
          <TextField
            placeholder="Search by name, URL, title, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={s.search}
          />
        </div>
      }
    >
      <div className={s.filters}>
        {(["all", "orphaned", "linked", "vercel", "subdomain"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? s.filterActive : s.filterBtn}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${data.length})`
              : f === "orphaned"
                ? `Orphaned (${orphanCount})`
                : f === "linked"
                  ? `Linked (${data.length - orphanCount})`
                  : f === "vercel"
                    ? `Vercel (${vercelCount})`
                    : `Subdomain (${data.filter((d) => d.subdomain).length})`}
          </button>
        ))}
      </div>

      <div className={s.list}>
        {visible.length === 0 && (
          <div className={s.empty}>No deployments match the current filter.</div>
        )}
        {visible.map((d) => {
          const deployedDate = d.vercelDeployedAt || d.subdomainDeployedAt || d.createdAt
          return (
            <div key={d.id} className={s.row}>
              <div className={s.rowLead}>
                <div className={s.rowTitle}>
                  {d.title || "(untitled)"}
                  {d.isOrphaned ? (
                    <span className={s.orphanTag}>orphaned</span>
                  ) : (
                    <Badge variant="success">linked</Badge>
                  )}
                </div>
                <div className={s.rowMeta}>
                  <span className={s.metaLabel}>
                    {d.vercelUrl ? (
                      <>
                        <Icon icon="hugeicons:link-square-02" />{" "}
                        <a href={d.vercelUrl} target="_blank" rel="noreferrer">
                          {d.vercelUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </>
                    ) : d.subdomain ? (
                      <>
                        <Icon icon="hugeicons:globe-02" />{" "}
                        <a
                          href={`https://${d.subdomain}.flow.kalit.ai`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.subdomain}.flow.kalit.ai
                        </a>
                      </>
                    ) : null}
                  </span>
                  {d.userEmail && (
                    <span className={s.metaEmail}>
                      <Icon icon="hugeicons:user-02" /> {d.userEmail}
                    </span>
                  )}
                  <span className={s.metaDate}>
                    <Icon icon="hugeicons:clock-01" />{" "}
                    {new Date(deployedDate).toLocaleString()}
                  </span>
                </div>
                <div className={s.rowSub}>
                  {d.vercelProjectName && (
                    <code className={s.code}>vercel: {d.vercelProjectName}</code>
                  )}
                  {d.subdomain && <code className={s.code}>subdomain: {d.subdomain}</code>}
                  <span className={s.statusTag}>{d.status}</span>
                </div>
              </div>
              <div className={s.rowActions}>
                <Button
                  variant="secondary"
                  onClick={() => handleTeardown(d, true)}
                  disabled={pending && pendingId === d.id}
                  className={s.deleteBtn}
                >
                  {pending && pendingId === d.id ? "Removing…" : "Remove"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </SurfacePanel>
  )
}
