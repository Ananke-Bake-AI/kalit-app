"use client"

import { Button } from "@/components/app/button"
import { Card } from "@/components/app/card"
import { Input } from "@/components/app/input"
import { SUITES, type SuiteId } from "@/lib/app-suites"
import { completeOnboarding } from "@/server/actions/onboarding"
import { Code, Globe, Megaphone, Shield } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

const SUITE_ICONS: Record<SuiteId, React.ReactNode> = {
  project: <Code className="h-6 w-6" />,
  flow: <Globe className="h-6 w-6" />,
  marketing: <Megaphone className="h-6 w-6" />,
  pentest: <Shield className="h-6 w-6" />,
}

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

    // Refresh the JWT token so middleware sees onboardingDone=true
    await update({ onboardingDone: true, orgId: result.orgId })
    router.push(result.redirectTo || "/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground font-heading">Welcome to Kalit</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {step === 1 ? "Set up your workspace" : "What do you want to do first?"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  s <= step ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card>
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Input
                id="orgName"
                label="Workspace name"
                placeholder="My Company"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
              <Input
                id="websiteUrl"
                label="Website (optional)"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (orgName.length < 2) {
                    toast.error("Workspace name must be at least 2 characters")
                    return
                  }
                  setStep(2)
                }}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {SUITES.map((suite) => (
                  <button
                    key={suite.id}
                    type="button"
                    onClick={() => setPrimarySuite(suite.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer ${
                      primarySuite === suite.id
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-muted-fg"
                    }`}
                  >
                    <div style={{ color: suite.color }}>{SUITE_ICONS[suite.id]}</div>
                    <span className="text-sm font-medium text-foreground">{suite.name}</span>
                    <span className="text-xs text-muted-fg leading-tight">
                      {suite.id === "project" && "Build an app"}
                      {suite.id === "flow" && "Create a site"}
                      {suite.id === "marketing" && "Launch growth"}
                      {suite.id === "pentest" && "Scan security"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleComplete} loading={loading} className="flex-1">
                  Get started
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
