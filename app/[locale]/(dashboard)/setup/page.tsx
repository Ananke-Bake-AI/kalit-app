"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Logo } from "@/components/logo"
import { TextField } from "@/components/text-field"
import { localePath } from "@/lib/i18n"
import { SUITES } from "@/lib/suites"
import { useI18n } from "@/stores/i18n"
import { completeOnboarding } from "@/server/actions/onboarding"
import clsx from "clsx"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, type CSSProperties } from "react"
import { toast } from "sonner"
import s from "../setup.module.scss"
import type { SuiteId } from "@/lib/app-suites"

const notes = [
  {
    title: "Name your workspace",
    body: "Use your company or project name.",
  },
  {
    title: "Add your website if you have one",
    body: "This helps Kalit tailor pages and campaigns later.",
  },
  {
    title: "Choose what to do first",
    body: "Start with the suite that matches your immediate goal.",
  },
]

export default function SetupPage() {
  const router = useRouter()
  const { update } = useSession()
  const { locale, t } = useI18n()
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
    router.push(localePath(result.redirectTo || "/dashboard", locale))
    router.refresh()
  }

  return (
    <section className={s.page}>
      <Container>
        <div className={s.shell}>
          <div className={s.showcase}>
            <span className={s.kicker}>Workspace onboarding</span>
            <div className={s.header}>
              <h1>Set up your workspace.</h1>
              <p>Two quick steps and you are in.</p>
            </div>

            <div className={s.progress}>
              {[1, 2].map((i) => (
                <span key={i} className={clsx(i <= step && s.active)} />
              ))}
            </div>

            <div className={s.notes}>
              {notes.map((note) => (
                <div key={note.title} className={s.note}>
                  <strong>{note.title}</strong>
                  <span>{note.body}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.header}>
              <h1>{step === 1 ? "Workspace details" : "Pick your first suite"}</h1>
              <p>
                {step === 1
                  ? "Name your company or project."
                  : "Choose what you want Kalit to help you with first."}
              </p>
            </div>

            {step === 1 && (
              <>
                <div className={s.field}>
                  <TextField
                    id="orgName"
                    label="Workspace name"
                    placeholder="My company"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    autoComplete="organization"
                  />
                </div>
                <div className={s.field}>
                  <TextField
                    id="websiteUrl"
                    label="Website (optional)"
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    autoComplete="url"
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
                      <div
                        className={s.icon}
                        style={{ "--suite-color": suite.color } as CSSProperties}
                      >
                        <Logo id={suite.id} />
                      </div>
                      <span className={s.name}>Kalit {suite.title}</span>
                      <span className={s.desc}>{t(`suites.${suite.id}Small`)}</span>
                    </button>
                  ))}
                </div>

                <div className={s.actions}>
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleComplete} disabled={loading}>
                    {loading ? "Setting up..." : "Launch workspace"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
