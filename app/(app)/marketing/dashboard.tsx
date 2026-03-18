"use client"

import { Button } from "@/components/app/button"
import { Card } from "@/components/app/card"
import { Badge } from "@/components/app/badge"
import { Plus } from "lucide-react"
import type { MarketingCampaign } from "@prisma/client"

interface MarketingDashboardProps {
  campaigns: MarketingCampaign[]
}

export function MarketingDashboard({ campaigns }: MarketingDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kalit Marketing</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Plan, create, run, and optimize acquisition campaigns
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-accent/10 p-4">
            <Plus className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No campaigns yet</h3>
          <p className="max-w-sm text-sm text-muted-fg">
            Let AI research your audience, generate creatives, and launch campaigns across channels.
          </p>
          <Button>Create your first campaign</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                <Badge variant={campaign.status === "active" ? "success" : "default"}>
                  {campaign.status}
                </Badge>
              </div>
              {campaign.channel && (
                <p className="text-sm text-muted-fg">Channel: {campaign.channel}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
