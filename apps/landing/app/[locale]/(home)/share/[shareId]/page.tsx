import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Page publique read-only d'une conversation partagée (type ChatGPT /share/<id>).
// Aucune auth. noindex (norme post-incident ChatGPT×Google). Le contenu est déjà
// sanitizé côté broker (texte + prompt affiné uniquement) — on ne fait que le rendu.

export const dynamic = "force-dynamic"

type ShareSegment = { type?: string; content?: string }
type ShareMessage = { id: string; role: string; content: string; createdAt: string }
type ShareSite = { published?: boolean; url?: string; projectId?: string; hasThumbnail?: boolean }
type SharePayload = { title?: string; messages?: ShareMessage[]; site?: ShareSite }

async function fetchShare(shareId: string): Promise<SharePayload | null> {
  const base = (process.env.BROKER_URL || "http://localhost:9000").replace(/\/+$/, "")
  try {
    const r = await fetch(`${base}/api/flow/share/${encodeURIComponent(shareId)}`, { cache: "no-store" })
    if (!r.ok) return null
    return (await r.json()) as SharePayload
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params
  const data = await fetchShare(shareId)
  const title = data?.title ? `${data.title} · Kalit` : "Conversation partagée · Kalit"
  return { title, robots: { index: false, follow: false } }
}

function segments(content: string): ShareSegment[] {
  const t = (content || "").trim()
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t)
      if (Array.isArray(arr)) return arr as ShareSegment[]
    } catch {
      /* texte brut */
    }
  }
  return [{ type: "text", content }]
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ locale: string; shareId: string }>
}) {
  const { locale, shareId } = await params
  const data = await fetchShare(shareId)
  if (!data) notFound()

  const site = data.site || {}
  const messages = data.messages || []

  return (
    <main className="kshare">
      <style>{CSS}</style>

      <header className="kshare__top">
        <a className="kshare__brand" href={`/${locale}`}>◆ Kalit</a>
        <span className="kshare__tag">Conversation partagée</span>
        <a className="kshare__cta" href={`/${locale}/studio`}>Créez le vôtre →</a>
      </header>

      <div className="kshare__wrap">
        <h1 className="kshare__title">{data.title || "Conversation"}</h1>

        {site.published && site.url ? (
          <section className="kshare__artifact">
            <div className="kshare__preview">
              <iframe src={site.url} title="preview" loading="lazy" />
            </div>
            <a className="kshare__visit" href={site.url} target="_blank" rel="noreferrer nofollow">
              Voir le site en ligne ↗
            </a>
          </section>
        ) : null}

        <section className="kshare__chat">
          {messages.map((m) => (
            <div key={m.id} className={`kshare__msg kshare__msg--${m.role === "user" ? "user" : "asst"}`}>
              <div className="kshare__av">{m.role === "user" ? "" : "◆"}</div>
              <div className="kshare__body">
                {segments(m.content).map((s, i) =>
                  s.type === "refinement" ? (
                    <details key={i} className="kshare__refine">
                      <summary>✨ Prompt affiné</summary>
                      <div className="kshare__pre">{s.content}</div>
                    </details>
                  ) : (
                    <div key={i} className="kshare__text">{s.content}</div>
                  ),
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="kshare__empty">Cette conversation est vide.</p>}
        </section>

        <footer className="kshare__foot">
          <a className="kshare__cta kshare__cta--big" href={`/${locale}/studio`}>
            Générez votre site avec Kalit →
          </a>
        </footer>
      </div>
    </main>
  )
}

const CSS = `
.kshare { min-height: 100vh; background: #0b0d10; color: #e7ebf0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
.kshare__top { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 14px; padding: 12px 20px; background: rgba(11,13,16,.85); backdrop-filter: blur(8px); border-bottom: 1px solid #23282f; }
.kshare__brand { font-weight: 700; color: #fff; text-decoration: none; letter-spacing: -.01em; }
.kshare__tag { font-size: 12px; color: #6b7683; border: 1px solid #23282f; border-radius: 999px; padding: 3px 10px; }
.kshare__cta { margin-left: auto; color: #6aa0ff; text-decoration: none; font-size: 13.5px; font-weight: 600; }
.kshare__cta:hover { color: #9dc0ff; }
.kshare__wrap { max-width: 820px; margin: 0 auto; padding: 28px 20px 80px; }
.kshare__title { font-size: 24px; font-weight: 700; letter-spacing: -.02em; margin: 4px 0 22px; }
.kshare__artifact { margin: 0 0 28px; }
.kshare__preview { border: 1px solid #23282f; border-radius: 12px; overflow: hidden; background: #fff; aspect-ratio: 16 / 10; }
.kshare__preview iframe { width: 100%; height: 100%; border: 0; }
.kshare__thumb { width: 100%; border: 1px solid #23282f; border-radius: 12px; display: block; }
.kshare__visit { display: inline-block; margin-top: 10px; color: #6aa0ff; text-decoration: none; font-weight: 600; font-size: 14px; }
.kshare__chat { display: flex; flex-direction: column; gap: 20px; }
.kshare__msg { display: flex; gap: 12px; }
.kshare__av { flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 13px; font-weight: 700; }
.kshare__msg--user .kshare__av { background: #1c2128; color: #a3adba; }
.kshare__msg--asst .kshare__av { background: #4c8dff; color: #fff; }
.kshare__body { min-width: 0; flex: 1; padding-top: 3px; }
.kshare__text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; font-size: 15px; color: #d7dde5; }
.kshare__msg--user .kshare__text { color: #e7ebf0; font-weight: 500; }
.kshare__refine { margin: 6px 0; font-size: 13px; }
.kshare__refine summary { cursor: pointer; color: #a3adba; }
.kshare__pre { white-space: pre-wrap; overflow-wrap: anywhere; margin-top: 6px; padding: 10px 12px; background: #101318; border: 1px solid #1a1e24; border-radius: 8px; color: #a3adba; line-height: 1.55; }
.kshare__empty { color: #6b7683; }
.kshare__foot { margin-top: 48px; padding-top: 24px; border-top: 1px solid #23282f; text-align: center; }
.kshare__cta--big { display: inline-block; padding: 12px 22px; border-radius: 999px; background: #4c8dff; color: #fff; }
.kshare__cta--big:hover { background: #6aa0ff; color: #fff; }
@media (max-width: 640px) { .kshare__wrap { padding: 20px 14px 60px; } .kshare__title { font-size: 20px; } }
`
