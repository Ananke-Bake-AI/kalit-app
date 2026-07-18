"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { SurfacePanel } from "@/components/surface-panel"
import {
  getAdminActiveBuilds,
  getAdminRecentProjects,
  getAdminUsageRecords
} from "@/server/actions/admin"
import { useEffect, useState, useTransition } from "react"
import s from "./monitoring.module.scss"

type BuildsData = Awaited<ReturnType<typeof getAdminActiveBuilds>>
type ProjectsData = Awaited<ReturnType<typeof getAdminRecentProjects>>
type UsageData = Awaited<ReturnType<typeof getAdminUsageRecords>>

const PROJECT_STATUS_COLORS: Record<string, "success" | undefined> = {
  ready: "success",
  completed: "success",
  active: "success"
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export function MonitoringClient({
  initialBuilds,
  initialProjects,
  initialUsage
}: {
  initialBuilds: BuildsData
  initialProjects: ProjectsData
  initialUsage: UsageData
}) {
  const [builds, setBuilds] = useState(initialBuilds)
  const [projects, setProjects] = useState(initialProjects)
  const [usage, setUsage] = useState(initialUsage)
  const [isPending, startTransition] = useTransition()

  // Live builds: poll every 10s so "who's generating right now" stays current
  // without a manual refresh — this panel is the real-time health signal.
  useEffect(() => {
    const t = setInterval(() => {
      getAdminActiveBuilds()
        .then(setBuilds)
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(t)
  }, [])

  const refreshProjects = (page: number) => {
    startTransition(async () => {
      setProjects(await getAdminRecentProjects({ page, limit: 20 }))
    })
  }
  const refreshUsage = (page: number) => {
    startTransition(async () => {
      setUsage(await getAdminUsageRecords({ page, limit: 20 }))
    })
  }

  return (
    <>
      <SurfacePanel
        spaced
        title="Active generations"
        subtitle={
          builds.total > 0
            ? `${builds.total} building right now`
            : "Nothing building right now"
        }
      >
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>User</span>
            <span>Model</span>
            <span>Project</span>
            <span>Tokens</span>
            <span>Started</span>
            <span>Status</span>
          </div>

          {builds.builds.map((b) => (
            <div key={b.id} className={s.tableRow}>
              <span className={s.orgName}>{b.userEmail ?? "—"}</span>
              <span>{b.model ?? "—"}</span>
              <span>{b.projectName ?? b.externalProjectId ?? "—"}</span>
              <span>{b.tokensSpent.toLocaleString()}</span>
              <span className={s.date}>{fmtTime(b.updatedAt)}</span>
              <span>
                <Badge variant="success">RUNNING</Badge>
              </span>
            </div>
          ))}

          {builds.builds.length === 0 && (
            <div className={s.empty}>No active builds right now.</div>
          )}
        </div>
      </SurfacePanel>

      <SurfacePanel
        spaced
        title="Recent projects"
        subtitle={`${projects.total} total project${projects.total !== 1 ? "s" : ""}`}
      >
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>Project</span>
            <span>User</span>
            <span>Status</span>
            <span>Published</span>
            <span>Tokens</span>
            <span>Created</span>
          </div>

          {projects.projects.map((p) => (
            <div key={p.externalProjectId} className={s.tableRow}>
              <span className={s.orgName}>{p.name ?? p.externalProjectId}</span>
              <span>{p.userEmail ?? "—"}</span>
              <span>
                {p.status ? (
                  <Badge variant={PROJECT_STATUS_COLORS[p.status]}>{p.status}</Badge>
                ) : (
                  "—"
                )}
              </span>
              <span>{p.published ? <Badge variant="success">Live</Badge> : "—"}</span>
              <span>{p.tokensSpent.toLocaleString()}</span>
              <span className={s.date}>{fmtDate(p.createdAt)}</span>
            </div>
          ))}

          {projects.projects.length === 0 && (
            <div className={s.empty}>No projects found.</div>
          )}
        </div>

        {projects.totalPages > 1 && (
          <div className={s.pagination}>
            <Button
              variant="secondary"
              disabled={projects.page <= 1 || isPending}
              onClick={() => refreshProjects(projects.page - 1)}
            >
              Previous
            </Button>
            <span className={s.pageInfo}>
              Page {projects.page} of {projects.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={projects.page >= projects.totalPages || isPending}
              onClick={() => refreshProjects(projects.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </SurfacePanel>

      <SurfacePanel
        spaced
        title="Usage Records"
        subtitle={`${usage.total} total record${usage.total !== 1 ? "s" : ""}`}
      >
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>Organization</span>
            <span>Suite</span>
            <span>Action</span>
            <span>Credits</span>
            <span>Date</span>
          </div>

          {usage.records.map((record) => (
            <div key={record.id} className={s.tableRow5}>
              <span className={s.orgName}>{record.org.name}</span>
              <span>{record.suiteId}</span>
              <span>{record.action}</span>
              <span>{record.credits}</span>
              <span className={s.date}>{record.createdAt.toLocaleDateString()}</span>
            </div>
          ))}

          {usage.records.length === 0 && <div className={s.empty}>No usage records yet.</div>}
        </div>

        {usage.totalPages > 1 && (
          <div className={s.pagination}>
            <Button
              variant="secondary"
              disabled={usage.page <= 1 || isPending}
              onClick={() => refreshUsage(usage.page - 1)}
            >
              Previous
            </Button>
            <span className={s.pageInfo}>
              Page {usage.page} of {usage.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={usage.page >= usage.totalPages || isPending}
              onClick={() => refreshUsage(usage.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </SurfacePanel>
    </>
  )
}
