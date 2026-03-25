import { Badge } from "@/components/badge"
import { Container } from "@/components/container"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import s from "./jobs.module.scss"

export default async function JobsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const jobs = await prisma.job.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <PageSection>
      <Container>
        <PageHeader
          align="left"
          title="Jobs"
          description="Track all execution jobs across your suites"
        />

        {jobs.length === 0 ? (
          <EmptyPlaceholder
            title="No jobs yet"
            description="Start using a suite to create your first job."
          />
        ) : (
          <div className={s.list}>
            {jobs.map((job) => (
              <div key={job.id} className={s.jobCard}>
                <div className={s.jobMain}>
                  <Badge>{job.suiteId}</Badge>
                  <div>
                    <div className={s.jobTitle}>{job.type}</div>
                    <p className={s.jobDate}>{new Date(job.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={s.jobMeta}>
                  {job.creditsUsed > 0 ? (
                    <span className={s.jobCredits}>{job.creditsUsed} credits</span>
                  ) : null}
                  <Badge variant={job.status === "SUCCEEDED" ? "success" : undefined}>
                    {job.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </PageSection>
  )
}
