"use client"

import { Button } from "@/components/button"
import type { FlowSite } from "@prisma/client"
import s from "../app.module.scss"

interface FlowDashboardProps {
  sites: FlowSite[]
}

export function FlowDashboard({ sites }: FlowDashboardProps) {
  return (
    <div>
      <div className={s.pageHeader}>
        <h1>Kalit Flow</h1>
        <p>Launch high-converting websites and landing pages</p>
      </div>

      {sites.length === 0 ? (
        <div className={s.emptyState}>
          <h3>No sites yet</h3>
          <p>
            Describe your site and let Kalit build the page, copy, and structure in minutes.
          </p>
          <Button>Create your first site</Button>
        </div>
      ) : (
        <div className={s.suitesGrid}>
          {sites.map((site) => (
            <div key={site.id} className={s.card}>
              <div className={s.cardTitle}>{site.name}</div>
              <span className={site.publishStatus === "published" ? `${s.badge} ${s.success}` : s.badge}>
                {site.publishStatus}
              </span>
              {site.domain && (
                <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer">
                  {site.domain}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
