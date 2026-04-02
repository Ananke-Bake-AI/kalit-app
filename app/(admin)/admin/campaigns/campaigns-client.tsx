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

const TAGS = [
  { tag: "{{name}}", label: "User name", desc: "Recipient's name (or \"there\" if empty)" },
  { tag: "{{email}}", label: "User email", desc: "Recipient's email address" },
]

const FORMAT_HELPERS = [
  { syntax: "**text**", label: "Bold", desc: "Renders as bold text" },
  { syntax: "[button:Label|https://...]", label: "CTA Button", desc: "Kalit-styled gradient button" },
  { syntax: "[link:Label|https://...]", label: "Link", desc: "Inline colored link" },
]

export function CampaignsClient({ initialStats }: { initialStats: Stats }) {
  const [stats] = useState(initialStats)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ sent: number; total: number; errors: string[] } | null>(null)

  const canSend = subject.trim().length > 0 && body.trim().length > 0

  const insertTag = (tag: string) => {
    setBody((prev) => prev + tag)
  }

  const previewBody = body
    .replace(/\{\{name\}\}/g, "Frederick")
    .replace(/\{\{email\}\}/g, "frederick@example.com")
    .replace(/\[button:(.+?)\|(.+?)\]/g, '<div style="margin: 16px 0;"><span style="display: inline-block; padding: 10px 22px; background: linear-gradient(135deg, #8200DF, #2F44FF); color: white; border-radius: 10px; font-weight: 600; font-size: 14px;">$1</span></div>')
    .replace(/\[link:(.+?)\|(.+?)\]/g, '<a style="color: #8200DF; text-decoration: underline;">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />")

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
      <SurfacePanel spaced title="Compose Campaign" subtitle="Emails use the branded Kalit template automatically">
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
            <label className={s.label}>Body</label>
            <div className={s.toolbar}>
              <span className={s.toolbarLabel}>Insert:</span>
              {TAGS.map((t) => (
                <button key={t.tag} className={s.tagBtn} onClick={() => insertTag(t.tag)} title={t.desc}>
                  {t.label}
                </button>
              ))}
              <span className={s.toolbarSep} />
              {FORMAT_HELPERS.map((f) => (
                <button key={f.syntax} className={s.tagBtn} onClick={() => insertTag(f.syntax)} title={f.desc}>
                  {f.label}
                </button>
              ))}
            </div>
            <textarea
              className={s.textarea}
              rows={12}
              placeholder={"Hi {{name}},\n\nWe're excited to announce a brand new feature on Kalit!\n\n**AI Flow** is now available — automate your workflows with intelligent agents.\n\n[button:Try it now|https://kalit.ai/flow]\n\nLet us know what you think!\nThe Kalit Team"}
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
        <SurfacePanel spaced title="Email Preview" subtitle="Preview with sample data — actual emails will be personalized per user">
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
              <div className={s.previewAccent} />
              <div className={s.previewContent}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a2e", margin: "0 0 16px" }}>{subject}</h1>
                <div
                  style={{ color: "#374151", fontSize: "15px", lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: previewBody }}
                />
              </div>
              <div className={s.previewFooter}>
                <p>Kalit AI — Build, Launch, Grow, Secure</p>
                <p>Merkle Tech Labs LTD.</p>
              </div>
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

      {/* Reference */}
      <SurfacePanel spaced title="Formatting Reference">
        <div className={s.refTable}>
          <div className={s.refHeader}>
            <span>Syntax</span>
            <span>Description</span>
          </div>
          <div className={s.refRow}>
            <code>{"{{name}}"}</code>
            <span>Replaced with the user&apos;s name (or &quot;there&quot; if empty)</span>
          </div>
          <div className={s.refRow}>
            <code>{"{{email}}"}</code>
            <span>Replaced with the user&apos;s email address</span>
          </div>
          <div className={s.refRow}>
            <code>**bold text**</code>
            <span>Renders as <strong>bold text</strong></span>
          </div>
          <div className={s.refRow}>
            <code>[button:Label|URL]</code>
            <span>Kalit-branded gradient CTA button</span>
          </div>
          <div className={s.refRow}>
            <code>[link:Label|URL]</code>
            <span>Inline purple link</span>
          </div>
          <div className={s.refRow}>
            <code>Blank line</code>
            <span>New paragraph</span>
          </div>
        </div>
      </SurfacePanel>
    </>
  )
}
