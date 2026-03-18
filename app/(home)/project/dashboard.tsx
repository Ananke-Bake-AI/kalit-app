"use client"

import { Button } from "@/components/button"
import type { ProjectApp } from "@prisma/client"
import s from "../app.module.scss"

interface ProjectDashboardProps {
  apps: ProjectApp[]
}

export function ProjectDashboard({ apps }: ProjectDashboardProps) {
  return (
    <div>
      <div className={s.pageHeader}>
        <h1>Kalit Project</h1>
        <p>Build and deploy full applications from a prompt</p>
      </div>

      {apps.length === 0 ? (
        <div className={s.emptyState}>
          <h3>No projects yet</h3>
          <p>
            Describe your app idea and let AI agents plan, build, test, and deploy it for you.
          </p>
          <Button>Create your first project</Button>
        </div>
      ) : (
        <div className={s.suitesGrid}>
          {apps.map((app) => (
            <div key={app.id} className={s.card}>
              <div className={s.cardTitle}>{app.name}</div>
              {app.description && <p>{app.description}</p>}
              <span className={s.badge}>
                {app.status}
              </span>
              {app.deploymentUrl && (
                <a href={app.deploymentUrl} target="_blank" rel="noopener noreferrer">
                  View live
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
