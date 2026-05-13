"use client"

import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { SurfacePanel } from "@/components/surface-panel"
import { LOCALE_CONFIG, LOCALES, type Locale } from "@/lib/i18n"
import { createBlogPost, deleteBlogPost, updateBlogPost } from "@/server/actions/admin"
import type { BlogPost } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import s from "./blog.module.scss"

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED"

interface Translation {
  title: string
  description: string
  body: string
  seoTitle?: string
  seoDescription?: string
}

type Translations = Record<string, Translation>

interface BlogComposerProps {
  initial?: BlogPost
}

const STATUSES: Status[] = ["DRAFT", "PUBLISHED", "ARCHIVED"]

const BODY_INSERTS = [
  { syntax: "## Heading\n", label: "H2", desc: "Section heading" },
  { syntax: "### Sub-heading\n", label: "H3", desc: "Sub-section" },
  { syntax: "**bold**", label: "B", desc: "Bold" },
  { syntax: "*italic*", label: "I", desc: "Italic" },
  { syntax: "[link](https://)", label: "Link", desc: "Inline link" },
  { syntax: "`code`", label: "code", desc: "Inline code" },
  { syntax: "```\ncode\n```\n", label: "```", desc: "Code block" },
  { syntax: "- list item\n- list item\n", label: "List", desc: "Bullet list" },
  { syntax: "> quote\n", label: "Quote", desc: "Blockquote" }
]

const AI_SUGGESTIONS = [
  "How Kalit Flow handles deploys for autonomous agents",
  "Why we picked Claude as the primary LLM",
  "Lessons from running our 12-agent pentest on a real production app",
  "What founders get wrong about MVP security",
  "Inside our Discord build challenge"
]

export function BlogComposer({ initial }: BlogComposerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)

  // ─── Core fields ─────────────────────────────────────────
  const [title, setTitle] = useState(initial?.title || "")
  const [slug, setSlug] = useState(initial?.slug || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [body, setBody] = useState(initial?.body || "")
  const [authorName, setAuthorName] = useState(initial?.authorName || "Frederick Marinho")
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState(initial?.authorAvatarUrl || "")
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl || "")
  const [ogImageUrl, setOgImageUrl] = useState(initial?.ogImageUrl || "")
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle || "")
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription || "")
  const [status, setStatus] = useState<Status>((initial?.status as Status) || "DRAFT")
  const [tags, setTags] = useState<string[]>(initial?.tags || [])
  const [tagInput, setTagInput] = useState("")

  // ─── i18n translations ───────────────────────────────────
  const [translations, setTranslations] = useState<Translations>(
    (initial?.translations as Translations | null) || {}
  )
  const [editLang, setEditLang] = useState<string>("en")

  const cur =
    editLang === "en"
      ? { title, description, body, seoTitle, seoDescription }
      : translations[editLang] || { title: "", description: "", body: "" }

  // ─── AI panel ─────────────────────────────────────────────
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiResult, setAiResult] = useState<{
    title: string
    description: string
    slug: string
    body: string
    tags: string[]
    seoTitle?: string
    seoDescription?: string
  } | null>(null)
  const aiInputRef = useRef<HTMLTextAreaElement>(null)
  const [translating, setTranslating] = useState(false)

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)

  const insertAtBody = (snippet: string) => {
    if (editLang === "en") setBody((b) => b + (b.endsWith("\n") ? "" : "\n") + snippet)
    else {
      setTranslations((t) => ({
        ...t,
        [editLang]: {
          ...(t[editLang] || { title: "", description: "", body: "" }),
          body: (t[editLang]?.body || "") + snippet
        }
      }))
    }
  }

  const setCurField = (field: keyof Translation, value: string) => {
    if (editLang === "en") {
      if (field === "title") setTitle(value)
      else if (field === "description") setDescription(value)
      else if (field === "body") setBody(value)
      else if (field === "seoTitle") setSeoTitle(value)
      else if (field === "seoDescription") setSeoDescription(value)
    } else {
      setTranslations((t) => ({
        ...t,
        [editLang]: {
          ...(t[editLang] || { title: "", description: "", body: "" }),
          [field]: value
        }
      }))
    }
  }

  const addTag = () => {
    const v = tagInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (!v || tags.includes(v)) return
    setTags((t) => [...t, v])
    setTagInput("")
  }

  const removeTag = (t: string) => setTags((tt) => tt.filter((x) => x !== t))

  // ─── AI generation ─────────────────────────────────────
  const generateWithAi = useCallback(
    async (p: string, refine = false) => {
      if (!p.trim()) return
      setAiLoading(true)
      setAiError("")
      setAiResult(null)
      try {
        const res = await fetch("/api/admin/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "blog",
            prompt: p,
            blog: refine
              ? {
                  currentTitle: title,
                  currentDescription: description,
                  currentBody: body,
                  currentSlug: slug,
                  currentTags: tags
                }
              : undefined
          })
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setAiError(data.error || "Failed to generate")
          return
        }
        setAiResult(data)
      } catch {
        setAiError("Network error. Please try again.")
      } finally {
        setAiLoading(false)
      }
    },
    [title, description, body, slug, tags]
  )

  const applyAi = () => {
    if (!aiResult) return
    setTitle(aiResult.title)
    setDescription(aiResult.description)
    setBody(aiResult.body)
    if (aiResult.slug) setSlug(aiResult.slug)
    if (aiResult.tags?.length) setTags(aiResult.tags)
    if (aiResult.seoTitle) setSeoTitle(aiResult.seoTitle)
    if (aiResult.seoDescription) setSeoDescription(aiResult.seoDescription)
    // Source changed — clear stale translations so they get regenerated.
    setTranslations({})
    setEditLang("en")
    setAiResult(null)
    setAiPrompt("")
    toast.success("AI draft applied. Review then publish.")
  }

  const generateTranslations = async () => {
    if (!title.trim() || !body.trim()) return
    setTranslating(true)
    try {
      const targets = LOCALES.filter((l) => l !== "en").map((code) => ({
        code,
        name: LOCALE_CONFIG[code as Locale].name
      }))
      const res = await fetch("/api/admin/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translateBlog: {
            sourceTitle: title,
            sourceDescription: description,
            sourceBody: body,
            targetLanguages: targets
          }
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || "Translation failed")
        return
      }
      const translated = (data.translations || {}) as Translations
      setTranslations((t) => ({ ...t, ...translated }))
      const count = Object.keys(translated).length
      toast.success(`Translated to ${count} language${count !== 1 ? "s" : ""}.`)
    } catch {
      toast.error("Network error during translation")
    } finally {
      setTranslating(false)
    }
  }

  // ─── Save / delete ─────────────────────────────────────
  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required")
      return
    }
    startTransition(async () => {
      const payload = {
        slug: slug || slugify(title),
        title,
        description,
        body,
        authorName,
        authorAvatarUrl,
        coverImageUrl,
        ogImageUrl,
        tags,
        seoTitle,
        seoDescription,
        translations: Object.keys(translations).length ? translations : null,
        status
      }
      const res = initial
        ? await updateBlogPost(initial.id, payload)
        : await createBlogPost(payload)
      if ("error" in res) {
        toast.error(res.error as string)
        return
      }
      toast.success(initial ? "Post saved." : "Post created.")
      if (!initial && "post" in res && res.post) {
        router.push(`/admin/blog/${res.post.id}`)
      } else {
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!initial) return
    if (!confirm(`Delete "${initial.title}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteBlogPost(initial.id)
      toast.success("Post deleted")
      router.push("/admin/blog")
    })
  }

  const translatedLangs = Object.keys(translations).filter((l) => l !== "en")

  return (
    <div className={s.composer}>
      {/* ─── MAIN COLUMN ─────────────────────────────── */}
      <div className={s.main}>
        {/* AI assistant */}
        <SurfacePanel title="AI assistant" subtitle="Describe the post and let AI draft it">
          {!aiOpen ? (
            <button
              className={s.aiToggle}
              onClick={() => {
                setAiOpen(true)
                setTimeout(() => aiInputRef.current?.focus(), 50)
              }}
            >
              <Icon icon="hugeicons:magic-wand-01" />
              <span>Write with AI</span>
              <span className={s.aiHint}>Generate title + body, then edit and translate</span>
            </button>
          ) : (
            <div className={s.aiPanel}>
              <textarea
                ref={aiInputRef}
                className={s.aiInput}
                rows={3}
                placeholder="e.g. A technical deep-dive on how the broker schedules concurrent agent sessions, with a real example from last week's release."
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
              <div className={s.aiSuggestions}>
                {AI_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    className={s.aiSuggestionBtn}
                    onClick={() => {
                      setAiPrompt(sug)
                      generateWithAi(sug)
                    }}
                    disabled={aiLoading}
                  >
                    {sug}
                  </button>
                ))}
              </div>
              <div className={s.aiButtons}>
                {title && (
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
                  {aiLoading ? "Generating…" : "Generate"}
                </Button>
              </div>
              {aiError && (
                <div className={s.aiError}>
                  <Icon icon="hugeicons:alert-02" />
                  {aiError}
                </div>
              )}
              {aiResult && (
                <div className={s.aiResult}>
                  <div className={s.aiResultHead}>
                    <span>AI draft</span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <Button variant="secondary" onClick={() => setAiResult(null)}>
                        Discard
                      </Button>
                      <Button variant="primary" onClick={applyAi}>
                        <Icon icon="hugeicons:checkmark-circle-02" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  <div className={s.aiResultFields}>
                    <div className={s.row}>
                      <span>Title</span>
                      <strong>{aiResult.title}</strong>
                    </div>
                    <div className={s.row}>
                      <span>Description</span>
                      <span>{aiResult.description}</span>
                    </div>
                    <div className={s.row}>
                      <span>Slug</span>
                      <code>{aiResult.slug}</code>
                    </div>
                    <div className={s.row}>
                      <span>Body</span>
                      <pre className={s.aiResultBody}>{aiResult.body}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SurfacePanel>

        {/* Compose */}
        <SurfacePanel
          title="Compose post"
          subtitle={
            translatedLangs.length
              ? `Editing in ${LOCALE_CONFIG[editLang as Locale]?.name || editLang}`
              : "Edit the source (English). Translate when you're happy."
          }
        >
          {/* Language tabs */}
          <div className={s.langBar}>
            <div className={s.langTabs}>
              <button
                className={`${s.langTab} ${editLang === "en" ? s.active : ""}`}
                onClick={() => setEditLang("en")}
              >
                <span>{LOCALE_CONFIG.en.flag}</span>
                <span>English (source)</span>
              </button>
              {translatedLangs.map((code) => (
                <button
                  key={code}
                  className={`${s.langTab} ${editLang === code ? s.active : ""}`}
                  onClick={() => setEditLang(code)}
                >
                  <span>{LOCALE_CONFIG[code as Locale]?.flag}</span>
                  <span>{LOCALE_CONFIG[code as Locale]?.name || code}</span>
                </button>
              ))}
            </div>
            {title && body && (
              <Button
                variant="secondary"
                onClick={generateTranslations}
                disabled={translating}
                circle={translating}
              >
                <Icon icon="hugeicons:translate" />
                {translating
                  ? "Translating…"
                  : translatedLangs.length
                    ? "Re-translate all"
                    : `Translate to ${LOCALES.length - 1} languages`}
              </Button>
            )}
          </div>

          {editLang !== "en" && (
            <div className={s.editingBanner}>
              <Icon icon="hugeicons:edit-02" />
              <span>
                Editing the <strong>{LOCALE_CONFIG[editLang as Locale]?.name || editLang}</strong>{" "}
                version.
              </span>
              <button
                onClick={() => {
                  setTranslations((t) => {
                    const next = { ...t }
                    delete next[editLang]
                    return next
                  })
                  setEditLang("en")
                }}
              >
                Remove translation
              </button>
            </div>
          )}

          {/* Title */}
          <div className={s.field}>
            <label className={s.label}>Title</label>
            <input
              className={s.input}
              type="text"
              value={cur.title}
              onChange={(e) => {
                setCurField("title", e.target.value)
                if (editLang === "en" && (!slug || slug === slugify(title))) {
                  setSlug(slugify(e.target.value))
                }
              }}
              placeholder="The hook that pulls readers in"
            />
          </div>

          {/* Description */}
          <div className={s.field}>
            <label className={s.label}>Description</label>
            <textarea
              className={s.input}
              rows={2}
              value={cur.description}
              onChange={(e) => setCurField("description", e.target.value)}
              placeholder="One-sentence summary — used for SEO and the post subtitle."
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Body */}
          <div className={s.field}>
            <label className={s.label}>Body (Markdown)</label>
            <div className={s.bodyEditor}>
              <div className={s.toolbar}>
                <span className={s.label} style={{ textTransform: "none", letterSpacing: 0, marginRight: "0.4rem" }}>
                  Insert:
                </span>
                {BODY_INSERTS.map((b) => (
                  <button
                    key={b.label}
                    className={s.tagBtn}
                    onClick={() => insertAtBody(b.syntax)}
                    title={b.desc}
                    type="button"
                  >
                    {b.label}
                  </button>
                ))}
                <span className={s.toolbarSep} />
                <button
                  className={s.tagBtn}
                  onClick={() => setShowPreview((p) => !p)}
                  type="button"
                  title="Toggle preview"
                >
                  <Icon icon="hugeicons:eye" /> {showPreview ? "Hide" : "Preview"}
                </button>
              </div>
              <textarea
                className={s.textarea}
                value={cur.body}
                onChange={(e) => setCurField("body", e.target.value)}
                placeholder={"# Heading\n\nFirst paragraph…"}
              />
            </div>
            <p className={s.helpRow}>
              Supports GitHub-flavored Markdown: <code>**bold**</code>, <code>## headings</code>,{" "}
              <code>- lists</code>, <code>```code```</code>, <code>&gt; quotes</code>,{" "}
              <code>[links](url)</code>.
            </p>
          </div>

          {showPreview && (
            <div className={s.previewFrame}>
              <h1>{cur.title || "Untitled"}</h1>
              <div className={s.previewMeta}>
                <span>{cur.description}</span>
              </div>
              <div className={s.previewBody}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.body}</ReactMarkdown>
              </div>
            </div>
          )}
        </SurfacePanel>
      </div>

      {/* ─── ASIDE COLUMN ────────────────────────────── */}
      <div className={s.aside}>
        <SurfacePanel title="Publish">
          <div className={s.field}>
            <label className={s.label}>Status</label>
            <div className={s.statusSelect}>
              {STATUSES.map((st) => (
                <button
                  key={st}
                  className={`${s.statusOption} ${status === st ? s.active : ""}`}
                  onClick={() => setStatus(st)}
                  type="button"
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className={s.actions} style={{ marginTop: "1rem" }}>
            {initial && (
              <button className={s.deleteBtn} onClick={handleDelete} type="button">
                Delete
              </button>
            )}
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isPending || !title.trim() || !body.trim()}
              circle={isPending}
            >
              <Icon icon="hugeicons:checkmark-circle-02" />
              {isPending ? "Saving…" : initial ? "Save" : "Create"}
            </Button>
          </div>

          {initial && (
            <div style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <Badge variant={status === "PUBLISHED" ? "success" : "warning"}>
                {status === "PUBLISHED" ? "Live" : status}
              </Badge>
              <p style={{ marginTop: "0.5rem" }}>
                <a href={`/blog/${slug}`} target="_blank" rel="noreferrer">
                  View on site →
                </a>
              </p>
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel title="Metadata">
          <div className={s.field}>
            <label className={s.label}>Slug</label>
            <input
              className={s.input}
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="kebab-case-slug"
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Author</label>
            <input
              className={s.input}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Author avatar URL</label>
            <input
              className={s.input}
              value={authorAvatarUrl}
              onChange={(e) => setAuthorAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Cover image URL</label>
            <input
              className={s.input}
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Tags</label>
            <div className={s.tagChips}>
              {tags.map((t) => (
                <span key={t} className={s.chip}>
                  {t}
                  <button onClick={() => removeTag(t)} type="button">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              className={s.input}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Type a tag and press Enter"
            />
          </div>
        </SurfacePanel>

        <SurfacePanel title="SEO overrides">
          <div className={s.field}>
            <label className={s.label}>SEO title</label>
            <input
              className={s.input}
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Optional — overrides Title in &lt;head&gt;"
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>SEO description</label>
            <textarea
              className={s.input}
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Optional — overrides meta description"
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>OG image URL</label>
            <input
              className={s.input}
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              placeholder="https://… (falls back to cover image)"
            />
          </div>
        </SurfacePanel>
      </div>
    </div>
  )
}
