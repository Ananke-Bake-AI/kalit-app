"use client"

import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import {
  deleteBugReport,
  getBugReport,
  listBugReports,
  updateBugReport,
  type BugReportRow,
  type BugReportDetail,
} from "@/server/actions/admin"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./bug-reports.module.scss"

type Status = BugReportRow["status"]

const STATUS_VARIANTS: Record<Status, { label: string; color: string }> = {
  open: { label: "Open", color: "var(--color-2)" },
  investigating: { label: "Investigating", color: "oklch(0.65 0.16 60)" },
  resolved: { label: "Resolved", color: "var(--success)" },
  invalid: { label: "Invalid", color: "var(--text-secondary)" },
  duplicate: { label: "Duplicate", color: "var(--text-secondary)" },
}

const STATUS_OPTIONS: Status[] = ["open", "investigating", "resolved", "invalid", "duplicate"]

export function BugReportsClient({ initial }: { initial: BugReportRow[] }) {
  const [rows, setRows] = useState<BugReportRow[]>(initial)
  const [filter, setFilter] = useState<Status | "all">("all")
  const [search, setSearch] = useState("")
  const [pending, startTransition] = useTransition()
  const [openId, setOpenId] = useState<string | null>(null)

  const refresh = () => {
    startTransition(async () => {
      const next = await listBugReports()
      if ("error" in next) {
        toast.error(next.error || "Reload failed")
        return
      }
      setRows(next.reports)
    })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false
      if (!q) return true
      return (
        r.description.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.userUsername.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    })
  }, [rows, filter, search])

  const counts = useMemo(() => {
    const c: Record<Status, number> = {
      open: 0, investigating: 0, resolved: 0, invalid: 0, duplicate: 0,
    }
    rows.forEach((r) => { c[r.status]++ })
    return c
  }, [rows])

  return (
    <div className={s.page}>
      <SurfacePanel
        spaced
        title="Bug reports"
        subtitle={`${rows.length} total · open ${counts.open} · investigating ${counts.investigating} · resolved ${counts.resolved}`}
        headerAside={
          <input
            className={s.search}
            placeholder="Search by description, email, id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <div className={s.filters}>
          <button
            type="button"
            className={filter === "all" ? s.filterActive : s.filterBtn}
            onClick={() => setFilter("all")}
          >
            All ({rows.length})
          </button>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              type="button"
              className={filter === st ? s.filterActive : s.filterBtn}
              onClick={() => setFilter(st)}
            >
              {STATUS_VARIANTS[st].label} ({counts[st]})
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className={s.empty}>
            <Icon icon="hugeicons:bug-01" />
            <p>No reports match this filter.</p>
          </div>
        ) : (
          <div className={s.list}>
            {visible.map((r) => (
              <BugRow
                key={r.id}
                row={r}
                pending={pending}
                onChanged={(updated) => {
                  setRows((prev) => prev.map((x) => x.id === updated.id ? { ...x, ...updated } : x))
                }}
                onDeleted={() => {
                  setRows((prev) => prev.filter((x) => x.id !== r.id))
                  toast.success("Report deleted")
                }}
                opened={openId === r.id}
                onToggleOpen={() => setOpenId(openId === r.id ? null : r.id)}
              />
            ))}
          </div>
        )}
      </SurfacePanel>
    </div>
  )
}

function BugRow({
  row,
  pending,
  onChanged,
  onDeleted,
  opened,
  onToggleOpen,
}: {
  row: BugReportRow
  pending: boolean
  onChanged: (updated: BugReportRow) => void
  onDeleted: () => void
  opened: boolean
  onToggleOpen: () => void
}) {
  const [detail, setDetail] = useState<BugReportDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [creditsDraft, setCreditsDraft] = useState(row.creditsAwarded || 0)
  const [noteDraft, setNoteDraft] = useState(row.adminNote || "")
  const [pendingPatch, startPatch] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  // Lazy-load the full record (with context) only when the row is opened.
  // Keeps the list query light + only fetches the heavy blob on demand.
  const ensureDetail = () => {
    if (detail || detailLoading) return
    setDetailLoading(true)
    void (async () => {
      const d = await getBugReport(row.id)
      if ("error" in d) {
        toast.error(d.error || "Failed to load report detail")
      } else {
        setDetail(d)
      }
      setDetailLoading(false)
    })()
  }

  const handleStatusChange = (next: Status) => {
    startPatch(async () => {
      const result = await updateBugReport(row.id, { status: next })
      if ("error" in result) {
        toast.error(result.error || "Update failed")
        return
      }
      if (result.report) onChanged(result.report)
      toast.success("Status updated")
    })
  }

  const handleAward = () => {
    if (creditsDraft <= 0) {
      toast.error("Set a positive credit amount")
      return
    }
    if (row.creditsAwarded > 0) {
      toast.error("Credits already awarded — admin actions are one-shot")
      return
    }
    if (!row.externalOrgId) {
      toast.error("Reporter has no orgId — can't grant credits")
      return
    }
    if (
      !confirm(
        `Grant ${creditsDraft} credits to ${row.userEmail || row.userUsername || row.userId}?\n\nThis inserts a positive CreditRecord and is reflected in their balance immediately.`,
      )
    ) {
      return
    }
    startPatch(async () => {
      const result = await updateBugReport(row.id, {
        creditsAwarded: creditsDraft,
        status: "resolved",
      })
      if ("error" in result) {
        toast.error(result.error || "Award failed")
        return
      }
      if (result.report) onChanged(result.report)
      toast.success(`Awarded ${creditsDraft} credits + marked resolved`)
    })
  }

  const handleSaveNote = () => {
    const next = noteDraft.trim()
    if (next === (row.adminNote || "")) return
    startPatch(async () => {
      const result = await updateBugReport(row.id, { adminNote: next })
      if ("error" in result) {
        toast.error(result.error || "Save note failed")
        return
      }
      if (result.report) onChanged(result.report)
      toast.success("Note saved")
    })
  }

  const handleDelete = () => {
    if (!confirm("Delete this report permanently? This cannot be undone.")) return
    startDelete(async () => {
      const result = await deleteBugReport(row.id)
      if ("error" in result) {
        toast.error(result.error || "Delete failed")
        return
      }
      onDeleted()
    })
  }

  const cfg = STATUS_VARIANTS[row.status]
  const handleHeaderClick = () => {
    if (!opened) ensureDetail()
    onToggleOpen()
  }

  return (
    <div className={s.row}>
      <button type="button" className={s.summary} onClick={handleHeaderClick}>
        <div className={s.summaryLeft}>
          <Icon icon={opened ? "hugeicons:arrow-down-01" : "hugeicons:arrow-right-01"} className={s.chevron} />
          <div className={s.summaryMain}>
            <div className={s.summaryTitle}>{row.description.split("\n")[0].slice(0, 110)}</div>
            <div className={s.summaryMeta}>
              <span>{row.userUsername ? `@${row.userUsername}` : row.userEmail || row.userId.slice(0, 8)}</span>
              <span>·</span>
              <span>{new Date(row.createdAt).toLocaleString()}</span>
              {row.sessionId && (
                <>
                  <span>·</span>
                  <span title={row.sessionId}>session {row.sessionId.slice(0, 8)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={s.summaryRight}>
          {row.creditsAwarded > 0 && (
            <span className={s.creditsBadge} title="Credits awarded">
              <Icon icon="hugeicons:star" />
              {row.creditsAwarded}
            </span>
          )}
          <span className={s.statusPill} style={{ background: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </button>

      {opened && (
        <div className={s.detail}>
          <div className={s.detailSection}>
            <div className={s.detailLabel}>Reporter</div>
            <div>
              {row.userUsername && <strong>@{row.userUsername} · </strong>}
              {row.userEmail || row.userId}
            </div>
          </div>

          <div className={s.detailSection}>
            <div className={s.detailLabel}>Description</div>
            <pre className={s.descPre}>{row.description}</pre>
          </div>

          {row.sessionId && (
            <div className={s.detailSection}>
              <div className={s.detailLabel}>Session / project</div>
              <div className={s.smallLinks}>
                <a href={`/studio?session=${row.sessionId}`} target="_blank" rel="noreferrer">
                  Open studio session
                </a>
                {row.projectId && (
                  <a href={`/studio/project/${row.projectId}`} target="_blank" rel="noreferrer">
                    Project page
                  </a>
                )}
              </div>
            </div>
          )}

          <div className={s.detailSection}>
            <div className={s.detailLabel}>Context snapshot</div>
            {detailLoading ? (
              <div className={s.muted}>Loading…</div>
            ) : detail ? (
              <details className={s.contextDetails}>
                <summary>Expand JSON context</summary>
                <pre className={s.contextPre}>{JSON.stringify(detail.context, null, 2)}</pre>
              </details>
            ) : (
              <div className={s.muted}>Open the row to load context.</div>
            )}
          </div>

          <div className={s.detailSection}>
            <div className={s.detailLabel}>Status</div>
            <div className={s.statusButtons}>
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={row.status === st ? s.statusActive : s.statusBtn}
                  onClick={() => handleStatusChange(st)}
                  disabled={pendingPatch || pending}
                >
                  {STATUS_VARIANTS[st].label}
                </button>
              ))}
            </div>
          </div>

          <div className={s.detailSection}>
            <div className={s.detailLabel}>Admin note (internal)</div>
            <textarea
              className={s.noteArea}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Triage notes — what was wrong, where the fix landed, etc."
              rows={3}
            />
            <button
              type="button"
              className={s.saveBtn}
              onClick={handleSaveNote}
              disabled={pendingPatch || noteDraft.trim() === (row.adminNote || "")}
            >
              Save note
            </button>
          </div>

          <div className={s.detailSection}>
            <div className={s.detailLabel}>Reward credits</div>
            {row.creditsAwarded > 0 ? (
              <div className={s.awardedNote}>
                <Icon icon="hugeicons:checkmark-circle-02" />
                {row.creditsAwarded} credits awarded
                {row.creditAwardedAt && (
                  <span className={s.muted}>
                    {" "}— {new Date(row.creditAwardedAt).toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              <div className={s.awardRow}>
                <input
                  type="number"
                  min={0}
                  max={1_000_000}
                  className={s.creditInput}
                  value={creditsDraft}
                  onChange={(e) => setCreditsDraft(Number(e.target.value) || 0)}
                />
                <span className={s.muted}>credits</span>
                <button
                  type="button"
                  className={s.awardBtn}
                  onClick={handleAward}
                  disabled={pendingPatch || creditsDraft <= 0 || !row.externalOrgId}
                >
                  <Icon icon="hugeicons:star" />
                  Award + mark resolved
                </button>
              </div>
            )}
          </div>

          <div className={s.detailSection}>
            <button
              type="button"
              className={s.dangerBtn}
              onClick={handleDelete}
              disabled={pendingDelete || pending}
            >
              <Icon icon="hugeicons:delete-02" />
              Delete report permanently
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
