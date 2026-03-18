"use client"

import { Button } from "@/components/app/button"
import { Card } from "@/components/app/card"
import { Badge } from "@/components/app/badge"
import { Plus, ExternalLink } from "lucide-react"
import type { FlowSite } from "@prisma/client"

interface FlowDashboardProps {
  sites: FlowSite[]
}

export function FlowDashboard({ sites }: FlowDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalit Flow</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Launch high-converting websites and landing pages
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New site
        </Button>
      </div>

      {sites.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-accent/10 p-4">
            <Plus className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No sites yet</h3>
          <p className="max-w-sm text-sm text-muted-fg">
            Describe your site and let Kalit build the page, copy, and structure in minutes.
          </p>
          <Button>Create your first site</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <Card key={site.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{site.name}</h3>
                <Badge variant={site.publishStatus === "published" ? "success" : "default"}>
                  {site.publishStatus}
                </Badge>
              </div>
              {site.domain && (
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {site.domain}
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
