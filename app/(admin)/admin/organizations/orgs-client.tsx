"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import {
  addCredits,
  assignPlan,
  getAdminOrganizations,
  grantEntitlement,
  revokeEntitlement,
  revokePlan
} from "@/server/actions/admin"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./organizations.module.scss"

type OrgData = Awaited<ReturnType<typeof getAdminOrganizations>>

const SUITE_ENTITLEMENTS = [
  { key: "suite.project.access", label: "Project" },
  { key: "suite.flow.access", label: "Flow" },
  { key: "suite.marketing.access", label: "Marketing" },
  { key: "suite.pentest.access", label: "Pentest" },
  { key: "suite.search.access", label: "Search" }
]

const PLANS = [
  { key: "starter", label: "Starter", desc: "Flow — 100 credits — 2 members" },
  { key: "pro", label: "Pro", desc: "Flow + Project + Marketing — 500 credits — 10 members" },
  { key: "enterprise", label: "Enterprise", desc: "All suites — 2,000 credits — Unlimited members" }
]

export function OrgsClient({ initialData }: { initialData: OrgData }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState("")
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [creditReason, setCreditReason] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [isPending, startTransition] = useTransition()

  const refresh = (params: { search?: string; page?: number }) => {
    startTransition(async () => {
      const result = await getAdminOrganizations({ search: params.search, page: params.page, limit: 30 })
      setData(result)
    })
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    refresh({ search: e.target.value, page: 1 })
  }

  const handleToggleSuite = async (orgId: string, key: string, hasAccess: boolean) => {
    if (hasAccess) {
      const result = await revokeEntitlement(orgId, key)
      if ("error" in result) toast.error(result.error as string)
      else toast.success("Access revoked")
    } else {
      const result = await grantEntitlement(orgId, key, { granted: true })
      if ("error" in result) toast.error(result.error as string)
      else toast.success("Access granted")
    }
    refresh({ search, page: data.page })
  }

  const handleAssignPlan = async (orgId: string, planKey: string) => {
    const result = await assignPlan(orgId, planKey, expiryDate || undefined)
    if ("error" in result) toast.error(result.error as string)
    else toast.success(`${result.plan} plan assigned${expiryDate ? ` (expires ${expiryDate})` : ""}`)
    refresh({ search, page: data.page })
  }

  const handleRevokePlan = async (orgId: string) => {
    if (!confirm("Revoke all manual entitlements for this org?")) return
    const result = await revokePlan(orgId)
    if ("error" in result) toast.error(result.error as string)
    else toast.success("Plan revoked")
    refresh({ search, page: data.page })
  }

  const handleAddCredits = async (orgId: string) => {
    const amount = parseInt(creditAmount)
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    const result = await addCredits(orgId, amount, creditReason || "Admin credit")
    if ("error" in result) toast.error(result.error as string)
    else {
      toast.success(`${amount} credits added`)
      setCreditAmount("")
      setCreditReason("")
    }
    refresh({ search, page: data.page })
  }

  return (
    <>
      <SurfacePanel
        spaced
        title="Organizations"
        subtitle={`${data.total} organization${data.total !== 1 ? "s" : ""}`}
        headerAside={
          <TextField
            placeholder="Search by name..."
            value={search}
            onChange={handleSearch}
            className={s.search}
          />
        }
      >
        <div className={s.list}>
          {data.orgs.map((org) => {
            const isExpanded = expandedOrg === org.id
            const entitlementKeys = org.entitlements.map((e) => e.key)
            const activeEntitlements = org.entitlements.filter((e) => !e.expiresAt || new Date(e.expiresAt) > new Date())
            const suiteCount = activeEntitlements.filter((e) => e.key.startsWith("suite.") && e.key.endsWith(".access")).length

            // Detect plan: Stripe sub > manual entitlements > free
            let planLabel = "Free"
            let planVariant: "success" | undefined = undefined
            if (org.subscriptions[0]) {
              planLabel = org.subscriptions[0].planKey
              planVariant = "success"
            } else if (suiteCount >= 5) {
              planLabel = "Enterprise (manual)"
              planVariant = "success"
            } else if (suiteCount >= 3) {
              planLabel = "Pro (manual)"
              planVariant = "success"
            } else if (suiteCount >= 1) {
              planLabel = "Starter (manual)"
              planVariant = "success"
            }

            return (
              <div key={org.id} className={s.orgItem}>
                <button
                  type="button"
                  className={s.orgRow}
                  onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                >
                  <span className={s.orgName}>{org.name}</span>
                  <span className={s.orgSlug}>{org.slug}</span>
                  <span className={s.orgStat}>{org._count.memberships} members</span>
                  <span className={s.orgStat}>{org._count.jobs} jobs</span>
                  <span>
                    <Badge variant={planVariant}>{planLabel}</Badge>
                  </span>
                  <span className={s.chevron}>
                    <Icon icon={isExpanded ? "hugeicons:arrow-up-01" : "hugeicons:arrow-down-01"} />
                  </span>
                </button>

                {isExpanded && (
                  <div className={s.orgDetail}>
                    <div className={s.detailSection}>
                      <h4 className={s.detailTitle}>Assign Plan</h4>
                      <div className={s.expiryRow}>
                        <label className={s.expiryLabel}>Expiry date (optional):</label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className={s.expiryInput}
                        />
                        {expiryDate && (
                          <button type="button" className={s.expiryClear} onClick={() => setExpiryDate("")}>
                            Clear
                          </button>
                        )}
                      </div>
                      <div className={s.planGrid}>
                        {PLANS.map((plan) => (
                          <button
                            key={plan.key}
                            type="button"
                            className={s.planCard}
                            onClick={() => handleAssignPlan(org.id, plan.key)}
                          >
                            <strong>{plan.label}</strong>
                            <span className={s.planDesc}>{plan.desc}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`${s.planCard} ${s.planRevoke}`}
                          onClick={() => handleRevokePlan(org.id)}
                        >
                          <strong>Revoke</strong>
                          <span className={s.planDesc}>Remove all manual entitlements</span>
                        </button>
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <h4 className={s.detailTitle}>Suite Access</h4>
                      <div className={s.suiteGrid}>
                        {SUITE_ENTITLEMENTS.map((suite) => {
                          const hasAccess = activeEntitlements.some((e) => e.key === suite.key)
                          return (
                            <button
                              key={suite.key}
                              type="button"
                              className={`${s.suiteToggle} ${hasAccess ? s.suiteActive : ""}`}
                              onClick={() => handleToggleSuite(org.id, suite.key, hasAccess)}
                            >
                              <span className={s.suiteIndicator} />
                              <span>{suite.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <h4 className={s.detailTitle}>Add Credits</h4>
                      <div className={s.creditForm}>
                        <TextField
                          type="number"
                          placeholder="Amount"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className={s.creditInput}
                        />
                        <TextField
                          placeholder="Reason"
                          value={creditReason}
                          onChange={(e) => setCreditReason(e.target.value)}
                          className={s.creditInput}
                        />
                        <Button variant="secondary" onClick={() => handleAddCredits(org.id)}>
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <h4 className={s.detailTitle}>Members</h4>
                      <div className={s.memberList}>
                        {org.memberships.map((m) => (
                          <div key={m.id} className={s.memberRow}>
                            <span>{m.user.name || m.user.email}</span>
                            <span className={s.memberEmail}>{m.user.email}</span>
                            <Badge>{m.role}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <h4 className={s.detailTitle}>All Entitlements</h4>
                      <div className={s.entitlementList}>
                        {org.entitlements.map((ent) => (
                          <div key={ent.id} className={s.entitlementRow}>
                            <span className={s.entKey}>{ent.key}</span>
                            <span className={s.entValue}>{JSON.stringify(ent.value)}</span>
                            <span className={s.entSource}>
                              {ent.source}
                              {ent.expiresAt && (
                                <span className={s.entExpiry}>
                                  {" "}expires {new Date(ent.expiresAt).toLocaleDateString()}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              className={s.revokeBtn}
                              onClick={() => handleToggleSuite(org.id, ent.key, true)}
                              title="Revoke"
                            >
                              <Icon icon="hugeicons:delete-02" />
                            </button>
                          </div>
                        ))}
                        {org.entitlements.length === 0 && (
                          <span className={s.emptyText}>No entitlements</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {data.orgs.length === 0 && (
            <div className={s.empty}>No organizations found.</div>
          )}
        </div>
      </SurfacePanel>

      {data.totalPages > 1 && (
        <div className={s.pagination}>
          <Button variant="secondary" disabled={data.page <= 1 || isPending} onClick={() => refresh({ search, page: data.page - 1 })}>
            Previous
          </Button>
          <span className={s.pageInfo}>Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" disabled={data.page >= data.totalPages || isPending} onClick={() => refresh({ search, page: data.page + 1 })}>
            Next
          </Button>
        </div>
      )}
    </>
  )
}
