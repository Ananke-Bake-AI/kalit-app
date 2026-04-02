"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import { getCampaignStats, sendCampaign } from "@/server/actions/admin"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./campaigns.module.scss"

type Stats = Awaited<ReturnType<typeof getCampaignStats>>

export function CampaignsClient({ initialStats }: { initialStats: Stats }) {
  const [stats] = useState(initialStats)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ sent: number; total: number; errors: string[] } | null>(null)

  const canSend = subject.trim().length > 0 && body.trim().length > 0

  const handleSend = () => {
    if (!canSend) return
    if (!confirm(`You are about to send this email to ${stats.verifiedUsers} verified users. Continue?`)) return

    setResult(null)
    startTransition(async () => {
      const res = await sendCampaign(subject, body)
      if ("error" in res) {
        toast.error(res.error as string)
      } else {
        toast.success(`Campaign sent to ${res.sent} users`)
        setResult({ sent: res.sent!, total: res.total!, errors: res.errors! })
      }
    })
  }

  return (
    <>
      {/* Stats */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <span className={s.statValue}>{stats.totalUsers}</span>
          <span className={s.statLabel}>Total users</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statValue}>{stats.verifiedUsers}</span>
          <span className={s.statLabel}>Verified (recipients)</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statValue}>{Math.ceil(stats.verifiedUsers / 50)}</span>
          <span className={s.statLabel}>Batches needed</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statValue}>~{Math.ceil(stats.verifiedUsers / 50)}s</span>
          <span className={s.statLabel}>Estimated time</span>
        </div>
      </div>

      {/* Compose */}
      <SurfacePanel spaced title="Compose Campaign" subtitle="Send a marketing or informational email to all verified users">
        <div className={s.form}>
          <div className={s.field}>
            <label className={s.label}>Subject</label>
            <TextField
              placeholder="e.g. New feature: AI Flow is here!"
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>
              Body <span className={s.labelHint}>(HTML supported)</span>
            </label>
            <textarea
              className={s.textarea}
              rows={12}
              placeholder={"<p>Hi there,</p>\n<p>We're excited to announce...</p>\n\n<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\">\n  <tr>\n    <td style=\"border-radius: 10px; background: linear-gradient(135deg, #8200DF, #2F44FF);\">\n      <a href=\"https://kalit.ai\" style=\"display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px;\">\n        Try it now\n      </a>\n    </td>\n  </tr>\n</table>"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!canSend}
            >
              <Icon icon="hugeicons:eye" />
              {showPreview ? "Hide preview" : "Preview"}
            </Button>

            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!canSend || isPending}
              circle={isPending}
            >
              <Icon icon="hugeicons:mail-send-02" />
              {isPending ? "Sending..." : `Send to ${stats.verifiedUsers} users`}
            </Button>
          </div>
        </div>
      </SurfacePanel>

      {/* Preview */}
      {showPreview && canSend && (
        <SurfacePanel spaced title="Email Preview" subtitle="This is how the email will look in inbox">
          <div className={s.previewFrame}>
            <div className={s.previewMeta}>
              <div className={s.previewMetaRow}>
                <span className={s.previewMetaLabel}>From</span>
                <span>Kalit AI &lt;noreply@kalit.ai&gt;</span>
              </div>
              <div className={s.previewMetaRow}>
                <span className={s.previewMetaLabel}>To</span>
                <span>{stats.verifiedUsers} verified users</span>
              </div>
              <div className={s.previewMetaRow}>
                <span className={s.previewMetaLabel}>Subject</span>
                <span className={s.previewSubject}>{subject}</span>
              </div>
            </div>
            <div className={s.previewBody}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a2e", margin: "0 0 16px" }}>{subject}</h1>
              <div
                style={{ color: "#374151", fontSize: "15px", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </div>
          </div>
        </SurfacePanel>
      )}

      {/* Result */}
      {result && (
        <SurfacePanel spaced title="Send Results">
          <div className={s.resultGrid}>
            <div className={s.resultItem}>
              <Badge variant="success">{result.sent} sent</Badge>
            </div>
            <div className={s.resultItem}>
              <span className={s.resultLabel}>Total recipients</span>
              <span>{result.total}</span>
            </div>
            {result.errors.length > 0 && (
              <div className={s.resultErrors}>
                <span className={s.resultLabel}>Errors</span>
                {result.errors.map((err, i) => (
                  <p key={i} className={s.resultError}>{err}</p>
                ))}
              </div>
            )}
          </div>
        </SurfacePanel>
      )}

      {/* Tips */}
      <SurfacePanel spaced title="Tips">
        <div className={s.tips}>
          <div className={s.tip}>
            <Icon icon="hugeicons:information-circle" />
            <span>Emails are sent in batches of 50 via Resend&apos;s batch API with a 1s delay between batches to respect rate limits.</span>
          </div>
          <div className={s.tip}>
            <Icon icon="hugeicons:code" />
            <span>The body supports full HTML. Use <code>&lt;p&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;strong&gt;</code>, and the CTA button template from the placeholder.</span>
          </div>
          <div className={s.tip}>
            <Icon icon="hugeicons:user-check-01" />
            <span>Only users with a verified email address will receive the campaign.</span>
          </div>
        </div>
      </SurfacePanel>
    </>
  )
}
