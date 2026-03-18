"use client"

import { Button } from "@/components/button"
import type { MarketingCampaign } from "@prisma/client"
import s from "../app.module.scss"

interface MarketingDashboardProps {
  campaigns: MarketingCampaign[]
}

export function MarketingDashboard({ campaigns }: MarketingDashboardProps) {
  return (
    <div>
      <div className={s.pageHeader}>
        <h1>Kalit Marketing</h1>
        <p>Plan, create, run, and optimize acquisition campaigns</p>
      </div>

      {campaigns.length === 0 ? (
        <div className={s.emptyState}>
          <h3>No campaigns yet</h3>
          <p>
            Let AI research your audience, generate creatives, and launch campaigns across channels.
          </p>
          <Button>Create your first campaign</Button>
        </div>
      ) : (
        <div className={s.suitesGrid}>
          {campaigns.map((campaign) => (
            <div key={campaign.id} className={s.card}>
              <div className={s.cardTitle}>{campaign.name}</div>
              <span className={campaign.status === "active" ? `${s.badge} ${s.success}` : s.badge}>
                {campaign.status}
              </span>
              {campaign.channel && (
                <p>Channel: {campaign.channel}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
