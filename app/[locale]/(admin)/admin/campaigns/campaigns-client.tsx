"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { TextField } from "@/components/text-field"
import { LOCALE_CONFIG, type Locale } from "@/lib/i18n"
import { getCampaignStats, sendCampaign } from "@/server/actions/admin"
import { useCallback, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import s from "./campaigns.module.scss"

type Stats = Awaited<ReturnType<typeof getCampaignStats>>
type Translations = Record<string, { subject: string; body: string }>

const TAGS = [
  { tag: "{{name}}", label: "User name", desc: "Recipient's name (or \"there\" if empty)" },
  { tag: "{{email}}", label: "User email", desc: "Recipient's email address" },
]

const FORMAT_HELPERS = [
  { syntax: "**text**", label: "Bold", desc: "Renders as bold text" },
  { syntax: "[button:Label|https://...]", label: "CTA Button", desc: "Kalit-styled gradient button" },
  { syntax: "[link:Label|https://...]", label: "Link", desc: "Inline colored link" },
]

const AI_SUGGESTIONS = [
  "Announce a new feature launch",
  "Monthly product update newsletter",
  "Welcome new users to the platform",
  "Re-engagement email for inactive users",
  "Special promotion or discount offer",
]

function formatPreview(raw: string) {
  return raw
    .replace(/\{\{name\}\}/g, "Frederick")
    .replace(/\{\{email\}\}/g, "frederick@example.com")
    .replace(/\[button:(.+?)\|(.+?)\]/g, '<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0;"><tr><td style="border-radius: 8px; background: linear-gradient(135deg, #8200DF, #2F44FF);"><a href="$2" style="display: inline-block; padding: 10px 22px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">$1</a></td></tr></table>')
    .replace(/\[link:(.+?)\|(.+?)\]/g, '<a href="$2" style="color: #8200DF; text-decoration: underline;">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, '</p><p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 12px;">')
    .replace(/\n/g, "<br />")
}

export function CampaignsClient({ initialStats }: { initialStats: Stats }) {
  const [stats] = useState(initialStats)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ sent: number; total: number; errors: string[] } | null>(null)

  // AI assistant state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ subject: string; body: string } | null>(null)
  const [aiError, setAiError] = useState("")
  const aiInputRef = useRef<HTMLTextAreaElement>(null)

  // Translations state
  const [translations, setTranslations] = useState<Translations>({})
  const [translating, setTranslating] = useState(false)
  const [previewLang, setPreviewLang] = useState("en")

  const canSend = subject.trim().length > 0 && body.trim().length > 0

  // Languages that have active users (excluding English which is the default)
  const otherLanguages = stats.languages.filter((l) => l.code !== "en")
  const hasTranslations = Object.keys(translations).length > 0

  const insertTag = (tag: string) => {
    setBody((prev) => prev + tag)
  }

  const generateWithAi = useCallback(async (prompt: string, refine = false) => {
    if (!prompt.trim()) return
    setAiLoading(true)
    setAiError("")
    setAiResult(null)

    try {
      const res = await fetch("/api/admin/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          ...(refine ? { currentSubject: subject, currentBody: body } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setAiError(data.error || "Failed to generate")
        return
      }

      setAiResult({ subject: data.subject, body: data.body })
    } catch {
      setAiError("Network error. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }, [subject, body])

  const applyAiResult = () => {
    if (!aiResult) return
    setSubject(aiResult.subject)
    setBody(aiResult.body)
    setAiResult(null)
    setAiPrompt("")
    setTranslations({}) // Clear old translations when content changes
    toast.success("AI content applied")
  }

  const generateTranslations = async () => {
    if (!canSend || otherLanguages.length === 0) return
    setTranslating(true)

    try {
      const targetLanguages = otherLanguages.map((l) => ({
        code: l.code,
        name: LOCALE_CONFIG[l.code as Locale]?.name || l.code,
      }))

      const res = await fetch("/api/admin/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translate: {
            sourceSubject: subject,
            sourceBody: body,
            targetLanguages,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || "Translation failed")
        return
      }

      setTranslations(data.translations || {})
      const count = Object.keys(data.translations || {}).length
      const errors = data.errors?.length || 0
      toast.success(`Generated ${count} translation${count !== 1 ? "s" : ""}${errors ? ` (${errors} failed)` : ""}`)
    } catch {
      toast.error("Network error during translation")
    } finally {
      setTranslating(false)
    }
  }

  // Get content for preview based on selected language
  const previewSubject = previewLang === "en" ? subject : (translations[previewLang]?.subject || subject)
  const previewBodyRaw = previewLang === "en" ? body : (translations[previewLang]?.body || body)
  const previewBody = formatPreview(previewBodyRaw)

  const handleSend = () => {
    if (!canSend) return

    const langInfo = hasTranslations
      ? ` (${Object.keys(translations).length + 1} languages)`
      : ""
    if (!confirm(`You are about to send this email to ${stats.verifiedUsers} verified users${langInfo}. Continue?`)) return

    setResult(null)
    startTransition(async () => {
      const allTranslations: Translations = { en: { subject, body }, ...translations }
      const res = await sendCampaign(subject, body, allTranslations)
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
          <span className={s.statValue}>{stats.unsubscribedUsers}</span>
          <span className={s.statLabel}>Unsubscribed</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statValue}>{stats.languages.length}</span>
          <span className={s.statLabel}>Languages</span>
        </div>
      </div>

      {/* AI Assistant */}
      <SurfacePanel
        spaced
        title="AI Assistant"
        subtitle="Describe what you want and let AI draft your campaign"
      >
        {!aiOpen ? (
          <button className={s.aiToggle} onClick={() => { setAiOpen(true); setTimeout(() => aiInputRef.current?.focus(), 50) }}>
            <Icon icon="hugeicons:magic-wand-01" />
            <span>Write with AI</span>
            <span className={s.aiToggleHint}>Describe your email and generate subject + body instantly</span>
          </button>
        ) : (
          <div className={s.aiPanel}>
            <div className={s.aiInputWrap}>
              <textarea
                ref={aiInputRef}
                className={s.aiInput}
                rows={3}
                placeholder="e.g. Announce our new AI Flow feature that lets users automate workflows with intelligent agents. Include a CTA to try it."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    generateWithAi(aiPrompt)
                  }
                }}
                disabled={aiLoading}
              />
              <div className={s.aiActions}>
                <div className={s.aiSuggestions}>
                  {AI_SUGGESTIONS.map((s_) => (
                    <button
                      key={s_}
                      className={s.aiSuggestionBtn}
                      onClick={() => { setAiPrompt(s_); generateWithAi(s_) }}
                      disabled={aiLoading}
                    >
                      {s_}
                    </button>
                  ))}
                </div>
                <div className={s.aiButtons}>
                  {(subject || body) && (
                    <Button
                      variant="secondary"
                      onClick={() => generateWithAi(aiPrompt, true)}
                      disabled={aiLoading || !aiPrompt.trim()}
                    >
                      <Icon icon="hugeicons:edit-02" />
                      Refine current
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => generateWithAi(aiPrompt)}
                    disabled={aiLoading || !aiPrompt.trim()}
                    circle={aiLoading}
                  >
                    <Icon icon="hugeicons:magic-wand-01" />
                    {aiLoading ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            </div>

            {aiError && (
              <div className={s.aiError}>
                <Icon icon="hugeicons:alert-02" />
                {aiError}
              </div>
            )}

            {aiResult && (
              <div className={s.aiResult}>
                <div className={s.aiResultHeader}>
                  <span className={s.aiResultLabel}>AI Draft</span>
                  <div className={s.aiResultActions}>
                    <Button variant="secondary" onClick={() => setAiResult(null)}>
                      Discard
                    </Button>
                    <Button variant="primary" onClick={applyAiResult}>
                      <Icon icon="hugeicons:checkmark-circle-02" />
                      Apply to campaign
                    </Button>
                  </div>
                </div>
                <div className={s.aiResultPreview}>
                  <div className={s.aiResultField}>
                    <span className={s.aiResultFieldLabel}>Subject</span>
                    <span className={s.aiResultFieldValue}>{aiResult.subject}</span>
                  </div>
                  <div className={s.aiResultField}>
                    <span className={s.aiResultFieldLabel}>Body</span>
                    <pre className={s.aiResultBody}>{aiResult.body}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </SurfacePanel>

      {/* Compose */}
      <SurfacePanel spaced title="Compose Campaign" subtitle="Emails use the branded Kalit template automatically">
        <div className={s.form}>
          <div className={s.field}>
            <label className={s.label}>Subject</label>
            <TextField
              placeholder="e.g. New feature: AI Flow is here!"
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSubject(e.target.value); setTranslations({}) }}
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
              onChange={(e) => { setBody(e.target.value); setTranslations({}) }}
            />
          </div>

          {/* Translations */}
          {otherLanguages.length > 0 && canSend && (
            <div className={s.translationsSection}>
              <div className={s.translationsHeader}>
                <div>
                  <span className={s.label}>Translations</span>
                  <span className={s.translationsHint}>
                    {hasTranslations
                      ? `${Object.keys(translations).length} language${Object.keys(translations).length !== 1 ? "s" : ""} ready`
                      : `${otherLanguages.length} other language${otherLanguages.length !== 1 ? "s" : ""} detected`}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={generateTranslations}
                  disabled={translating}
                  circle={translating}
                >
                  <Icon icon="hugeicons:translate" />
                  {translating ? "Translating..." : hasTranslations ? "Regenerate" : "Generate translations"}
                </Button>
              </div>

              {hasTranslations && (
                <div className={s.langTabs}>
                  {stats.languages.map((l) => {
                    const cfg = LOCALE_CONFIG[l.code as Locale]
                    const isReady = l.code === "en" || translations[l.code]
                    return (
                      <button
                        key={l.code}
                        className={`${s.langTab} ${previewLang === l.code ? s.langTabActive : ""} ${!isReady ? s.langTabMissing : ""}`}
                        onClick={() => setPreviewLang(l.code)}
                      >
                        <span className={s.langFlag}>{cfg?.flag}</span>
                        <span>{cfg?.name || l.code}</span>
                        <Badge variant={isReady ? "success" : "warning"}>{l.count}</Badge>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => { setShowPreview(!showPreview); setPreviewLang("en") }}
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
          {/* Language preview tabs */}
          {hasTranslations && (
            <div className={s.previewLangBar}>
              {stats.languages.map((l) => {
                const cfg = LOCALE_CONFIG[l.code as Locale]
                const isReady = l.code === "en" || translations[l.code]
                if (!isReady) return null
                return (
                  <button
                    key={l.code}
                    className={`${s.previewLangBtn} ${previewLang === l.code ? s.previewLangBtnActive : ""}`}
                    onClick={() => setPreviewLang(l.code)}
                  >
                    {cfg?.flag} {cfg?.name || l.code}
                  </button>
                )
              })}
            </div>
          )}
          <div className={s.previewFrame}>
            <div className={s.previewMeta}>
              <div className={s.previewMetaRow}>
                <span className={s.previewMetaLabel}>From</span>
                <span>Kalit AI &lt;noreply@kalit.ai&gt;</span>
              </div>
              <div className={s.previewMetaRow}>
                <span className={s.previewMetaLabel}>To</span>
                <span>
                  {previewLang === "en"
                    ? `${stats.languages.find((l) => l.code === "en")?.count || stats.verifiedUsers} users`
                    : `${stats.languages.find((l) => l.code === previewLang)?.count || 0} ${LOCALE_CONFIG[previewLang as Locale]?.name || previewLang} users`}
                </span>
              </div>
              <div className={s.previewMetaRow}>
                <span className={s.previewMetaLabel}>Subject</span>
                <span className={s.previewSubject}>{previewSubject}</span>
              </div>
            </div>
            <div className={s.previewBody}>
              <div className={s.previewAccent} />
              <div className={s.previewContent}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a2e", margin: "0 0 16px" }}>{previewSubject}</h1>
                <div
                  style={{ color: "#374151", fontSize: "15px", lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: `<p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 12px;">${previewBody}</p>` }}
                />
              </div>
              <div className={s.previewFooter}>
                <p>Kalit AI — Build, Launch, Grow, Secure</p>
                <p>Merkle Tech Labs LTD.</p>
                <p style={{ marginTop: 8 }}><a href="#" style={{ color: "#d1d5db", textDecoration: "underline", fontSize: "11px" }}>Unsubscribe</a></p>
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
            {hasTranslations && (
              <div className={s.resultItem}>
                <span className={s.resultLabel}>Languages</span>
                <span>{Object.keys(translations).length + 1}</span>
              </div>
            )}
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
