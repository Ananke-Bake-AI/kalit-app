"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { TextField } from "@/components/text-field"
import { pushDataLayer } from "@/lib/analytics/data-layer"
import { localePath } from "@/lib/i18n"
import { useI18n } from "@/stores/i18n"
import { completeOnboarding } from "@/server/actions/onboarding"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import s from "../setup.module.scss"

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
    title: "Jump straight into Studio",
    body: "Suites are reachable any time from the top-nav.",
  },
]

/**
 * Onboarding screen — collapsed to a single step. We used to ask the
 * user to pick a primary suite (Flow / Pentest / Search / Marketing)
 * before granting access, but that forced a decision before the user
 * had ever interacted with the product. The new flow drops them in
 * Studio with Flow pre-selected as default; they can browse the other
 * suites from the header at any time.
 */
export default function SetupPage() {
  const router = useRouter()
  const { update } = useSession()
  const { locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")

  const handleComplete = async () => {
    if (orgName.length < 2) {
      toast.error("Workspace name must be at least 2 characters")
      return
    }

    setLoading(true)
    const result = await completeOnboarding({
      orgName,
      websiteUrl,
      // Flow is the default surface — most onboarding intent maps to
      // "build me a landing / app". Trial entitlements grant access to
      // all suites regardless of this default, so the user can switch
      // any time from the top-nav.
      primarySuite: "flow",
    })

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    // Trial activation north-star: onboarding done → 14-day trial granted.
    // → StartTrial on the Meta Pixel (and trial_started in GTM/GA4).
    pushDataLayer("trial_started", { plan: "trial", method: "onboarding" })

    await update({ onboardingDone: true, orgId: result.orgId })
    // Skip result.redirectTo (which points at /flow) and route to /studio
    // — that's where the new user actually starts working.
    router.push(localePath("/studio", locale))
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
              <p>One quick step and you are in.</p>
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
              <h1>Workspace details</h1>
              <p>Name your company or project — you can change it later.</p>
            </div>

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

            <Button onClick={handleComplete} disabled={loading}>
              {loading ? "Setting up…" : "Launch Studio"}
            </Button>

            <p className={s.hint}>
              You will land in Kalit Studio. The Flow, Pentest and Search suites are
              accessible at any time from the “Suites” menu at the top.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
