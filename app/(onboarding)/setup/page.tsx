"use client"

import { Button } from "@/components/button"
import { Logo } from "@/components/logo"
import { SUITES } from "@/lib/suites"
import { completeOnboarding } from "@/server/actions/onboarding"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import s from "../setup.module.scss"
import clsx from "clsx"
import type { SuiteId } from "@/lib/app-suites"

export default function SetupPage() {
  const router = useRouter()
  const { update } = useSession()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [primarySuite, setPrimarySuite] = useState<SuiteId | null>(null)

  const handleComplete = async () => {
    if (!primarySuite) {
      toast.error("Please select what you want to do first")
      return
    }

    setLoading(true)
    const result = await completeOnboarding({
      orgName,
      websiteUrl,
      primarySuite,
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    await update({ onboardingDone: true, orgId: result.orgId })
    router.push(result.redirectTo || "/dashboard")
    router.refresh()
  }

  return (
    <div className={s.page}>
      <div className={s.wrapper}>
        <div className={s.header}>
          <h1>Welcome to Kalit</h1>
          <p>{step === 1 ? "Set up your workspace" : "What do you want to do first?"}</p>
          <div className={s.progress}>
            {[1, 2].map((i) => (
              <span key={i} className={clsx(i <= step && s.active)} />
            ))}
          </div>
        </div>

        <div className={s.card}>
          {step === 1 && (
            <>
              <div className={s.field}>
                <label htmlFor="orgName">Workspace name</label>
                <input
                  id="orgName"
                  placeholder="My Company"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div className={s.field}>
                <label htmlFor="websiteUrl">Website (optional)</label>
                <input
                  id="websiteUrl"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  if (orgName.length < 2) {
                    toast.error("Workspace name must be at least 2 characters")
                    return
                  }
                  setStep(2)
                }}
              >
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className={s.suites}>
                {SUITES.map((suite) => (
                  <button
                    key={suite.id}
                    type="button"
                    onClick={() => setPrimarySuite(suite.id as SuiteId)}
                    className={clsx(s.suiteCard, primarySuite === suite.id && s.active)}
                  >
                    <div className={s.icon} style={{ color: suite.color }}>
                      <Logo id={suite.id} />
                    </div>
                    <span className={s.name}>{suite.title}</span>
                    <span className={s.desc}>
                      {suite.id === "project" && "Build an app"}
                      {suite.id === "flow" && "Create a site"}
                      {suite.id === "marketing" && "Launch growth"}
                      {suite.id === "pentest" && "Scan security"}
                    </span>
                  </button>
                ))}
              </div>

              <div className={s.actions}>
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? "Setting up..." : "Get started"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
