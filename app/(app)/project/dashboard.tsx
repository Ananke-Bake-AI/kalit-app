"use client"

import { Button } from "@/components/app/button"
import { Card } from "@/components/app/card"
import { Badge } from "@/components/app/badge"
import { Plus, ExternalLink } from "lucide-react"
import type { ProjectApp } from "@prisma/client"

interface ProjectDashboardProps {
  apps: ProjectApp[]
}

export function ProjectDashboard({ apps }: ProjectDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalit Project</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Build and deploy full applications from a prompt
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {apps.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-accent/10 p-4">
            <Plus className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
          <p className="max-w-sm text-sm text-muted-fg">
            Describe your app idea and let AI agents plan, build, test, and deploy it for you.
          </p>
          <Button>Create your first project</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <Card key={app.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{app.name}</h3>
                <Badge variant={app.status === "deployed" ? "success" : "default"}>
                  {app.status}
                </Badge>
              </div>
              {app.description && (
                <p className="text-sm text-muted-fg line-clamp-2">{app.description}</p>
              )}
              {app.deploymentUrl && (
                <a
                  href={app.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View live
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
