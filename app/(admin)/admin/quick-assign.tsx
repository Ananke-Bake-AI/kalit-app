"use client"

import { Button } from "@/components/button"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import { assignPlanByEmail } from "@/server/actions/admin"
import { useState } from "react"
import { toast } from "sonner"
import s from "./dashboard.module.scss"

const PLANS = [
  { key: "starter", label: "Starter" },
  { key: "pro", label: "Pro" },
  { key: "enterprise", label: "Enterprise" }
]

export function QuickAssign() {
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("pro")
  const [expiry, setExpiry] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAssign = async () => {
    if (!email.trim()) {
      toast.error("Enter an email address")
      return
    }
    setLoading(true)
    const result = await assignPlanByEmail(email.trim(), plan, expiry || undefined)
    setLoading(false)

    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      const res = result as { plan: string; orgName: string }
      toast.success(`${res.plan} assigned to ${res.orgName}`)
      setEmail("")
      setExpiry("")
    }
  }

  return (
    <SurfacePanel
      spaced
      title="Quick assign plan"
      subtitle="Give a user access by email — assigns the plan to their organization."
    >
      <div className={s.assignForm}>
        <TextField
          placeholder="user@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={s.assignEmail}
        />
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className={s.assignSelect}
        >
          {PLANS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className={s.assignDate}
          placeholder="Expiry (optional)"
        />
        <Button onClick={handleAssign} disabled={loading}>
          {loading ? "Assigning..." : "Assign"}
        </Button>
      </div>
    </SurfacePanel>
  )
}
