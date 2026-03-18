import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Container } from "@/components/container"
import s from "../app.module.scss"

export default async function JobsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const jobs = await prisma.job.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <section className={s.page}>
      <Container>
        <div className={s.pageHeader}>
          <h1>Jobs</h1>
          <p>Track all execution jobs across your suites</p>
        </div>

        {jobs.length === 0 ? (
          <div className={s.emptyState}>
            <h3>No jobs yet</h3>
            <p>Start using a suite to create your first job.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--size-2)" }}>
            {jobs.map((job) => (
              <div key={job.id} className={s.card} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--size-4)" }}>
                  <span className={s.badge}>{job.suiteId}</span>
                  <div>
                    <div className={s.cardTitle} style={{ marginBottom: 0 }}>{job.type}</div>
                    <p style={{ fontSize: "0.8em", color: "var(--text-secondary)" }}>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--size-3)" }}>
                  {job.creditsUsed > 0 && (
                    <span style={{ fontSize: "0.8em", color: "var(--text-secondary)" }}>
                      {job.creditsUsed} credits
                    </span>
                  )}
                  <span className={
                    job.status === "SUCCEEDED"
                      ? `${s.badge} ${s.success}`
                      : s.badge
                  }>
                    {job.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
