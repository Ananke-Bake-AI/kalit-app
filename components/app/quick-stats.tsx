import { Card } from "@/components/app/card"
import { Activity, CreditCard, Users, Zap } from "lucide-react"

interface QuickStatsProps {
  credits: number
  maxCredits: number
  activeJobs: number
  teamMembers: number
  planKey: string | null
}

export function QuickStats({ credits, maxCredits, activeJobs, teamMembers, planKey }: QuickStatsProps) {
  const stats = [
    {
      label: "Current plan",
      value: planKey ? planKey.charAt(0).toUpperCase() + planKey.slice(1) : "Free",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      label: "Credits remaining",
      value: `${credits} / ${maxCredits}`,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      label: "Active jobs",
      value: activeJobs.toString(),
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Team members",
      value: teamMembers.toString(),
      icon: <Users className="h-4 w-4" />,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="flex items-start gap-3 p-4">
          <div className="rounded-lg bg-muted p-2 text-muted-fg">{stat.icon}</div>
          <div>
            <p className="text-xs text-muted-fg">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
