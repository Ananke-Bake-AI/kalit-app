import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { SurfacePanel } from "@/components/surface-panel"
import { requireAdmin } from "@/lib/admin"
import { listBlogPosts } from "@/server/actions/admin"
import s from "./blog.module.scss"

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived"
}

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"

export default async function AdminBlogPage() {
  await requireAdmin()
  const posts = await listBlogPosts()

  return (
    <SurfacePanel
      spaced
      title="Blog"
      subtitle={`${posts.length} posts · drafts, published and archived`}
    >
      <div className={s.listHeader}>
        <div>
          <h2>All posts</h2>
          <p>Compose a new post or edit an existing one.</p>
        </div>
        <Button href="/admin/blog/new" variant="primary">
          <Icon icon="hugeicons:plus-sign" />
          New post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className={s.empty}>
          No posts yet. <Link href="/admin/blog/new">Compose your first one</Link>.
        </div>
      ) : (
        <div className={s.posts}>
          {posts.map((p) => {
            const cls = STATUS_CLASS[p.status] || "draft"
            const langCount = p.translations
              ? 1 + Object.keys(p.translations as Record<string, unknown>).length
              : 1
            return (
              <Link key={p.id} href={`/admin/blog/${p.id}`} className={s.postRow}>
                <div className={s.postMain}>
                  <h3 className={s.postTitle}>{p.title}</h3>
                  <div className={s.postMeta}>
                    <span>/blog/{p.slug}</span>
                    <span className={s.dot}>·</span>
                    <span>{p.authorName}</span>
                    <span className={s.dot}>·</span>
                    <span>{fmt(p.publishedAt) || fmt(p.updatedAt)}</span>
                    {langCount > 1 && (
                      <>
                        <span className={s.dot}>·</span>
                        <span>{langCount} languages</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`${s.statusBadge} ${s[cls]}`}>{p.status}</span>
                <Icon icon="hugeicons:arrow-right-02" />
              </Link>
            )
          })}
        </div>
      )}
    </SurfacePanel>
  )
}
