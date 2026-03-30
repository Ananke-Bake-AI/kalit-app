"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { SurfacePanel } from "@/components/surface-panel"
import { getAdminJobs, getAdminUsageRecords } from "@/server/actions/admin"
import { useState, useTransition } from "react"
import s from "./monitoring.module.scss"

type JobsData = Awaited<ReturnType<typeof getAdminJobs>>
type UsageData = Awaited<ReturnType<typeof getAdminUsageRecords>>

const JOB_STATUS_COLORS: Record<string, "success" | undefined> = {
  SUCCEEDED: "success",
  RUNNING: "success"
}

export function MonitoringClient({
  initialJobs,
  initialUsage
}: {
  initialJobs: JobsData
  initialUsage: UsageData
}) {
  const [jobs, setJobs] = useState(initialJobs)
  const [usage, setUsage] = useState(initialUsage)
  const [statusFilter, setStatusFilter] = useState("")
  const [isPending, startTransition] = useTransition()

  const refreshJobs = (params: { status?: string; page?: number }) => {
    startTransition(async () => {
      const result = await getAdminJobs({
        status: params.status || undefined,
        page: params.page,
        limit: 20
      })
      setJobs(result)
    })
  }

  const refreshUsage = (page: number) => {
    startTransition(async () => {
      const result = await getAdminUsageRecords({ page, limit: 20 })
      setUsage(result)
    })
  }

  return (
    <>
      <SurfacePanel
        spaced
        title="Jobs"
        subtitle={`${jobs.total} total job${jobs.total !== 1 ? "s" : ""}`}
        headerAside={
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              refreshJobs({ status: e.target.value, page: 1 })
            }}
            className={s.filter}
          >
            <option value="">All statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="RUNNING">Running</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        }
      >
        <div className={s.table}>
          <div className={s.tableHeader}>
            <span>Organization</span>
            <span>Suite</span>
            <span>Type</span>
            <span>Status</span>
            <span>Credits</span>
            <span>Created</span>
          </div>

          {jobs.jobs.map((job) => (
            <div key={job.id} className={s.tableRow}>
              <span className={s.orgName}>{job.org.name}</span>
              <span>{job.suiteId}</span>
              <span>{job.type}</span>
              <span>
                <Badge variant={JOB_STATUS_COLORS[job.status]}>{job.status}</Badge>
              </span>
              <span>{job.creditsUsed}</span>
              <span className={s.date}>{job.createdAt.toLocaleDateString()}</span>
            </div>
          ))}

          {jobs.jobs.length === 0 && <div className={s.empty}>No jobs found.</div>}
        </div>

        {jobs.totalPages > 1 && (
          <div className={s.pagination}>
            <Button
              variant="secondary"
              disabled={jobs.page <= 1 || isPending}
              onClick={() => refreshJobs({ status: statusFilter, page: jobs.page - 1 })}
            >
              Previous
            </Button>
            <span className={s.pageInfo}>
              Page {jobs.page} of {jobs.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={jobs.page >= jobs.totalPages || isPending}
              onClick={() => refreshJobs({ status: statusFilter, page: jobs.page + 1 })}
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
