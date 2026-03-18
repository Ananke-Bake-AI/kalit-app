import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/app/badge"
import { Card } from "@/components/app/card"
import { redirect } from "next/navigation"

export default async function JobsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const jobs = await prisma.job.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const statusVariant = (status: string) => {
    switch (status) {
      case "SUCCEEDED": return "success" as const
      case "FAILED": case "CANCELLED": return "destructive" as const
      case "RUNNING": case "QUEUED": return "warning" as const
      default: return "default" as const
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Track all execution jobs across your suites
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-muted-fg">No jobs yet. Start using a suite to create your first job.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <Card key={job.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Badge>{job.suiteId}</Badge>
                <div>
                  <p className="text-sm font-medium text-foreground">{job.type}</p>
                  <p className="text-xs text-muted-fg">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {job.creditsUsed > 0 && (
                  <span className="text-xs text-muted-fg">{job.creditsUsed} credits</span>
                )}
                <Badge variant={statusVariant(job.status)}>{job.status.toLowerCase()}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
