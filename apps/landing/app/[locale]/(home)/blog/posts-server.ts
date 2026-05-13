// Server-only access layer for blog posts. Keeps page files clean and
// supplies a single place to resolve locale fallbacks.
import "server-only"
import { prisma } from "@/lib/prisma"
import type { Locale } from "@/lib/i18n"
import type { BlogPost } from "@prisma/client"

export interface ResolvedPost {
  id: string
  slug: string
  title: string
  description: string
  body: string
  authorName: string
  authorAvatarUrl: string | null
  coverImageUrl: string | null
  ogImageUrl: string | null
  tags: string[]
  seoTitle: string | null
  seoDescription: string | null
  publishedAt: Date | null
  updatedAt: Date
  readingMinutes: number
  locale: Locale
}

interface TranslationEntry {
  title?: string
  description?: string
  body?: string
  seoTitle?: string
  seoDescription?: string
}

function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function resolveLocale(post: BlogPost, locale: Locale): ResolvedPost {
  const trMap = (post.translations as Record<string, TranslationEntry> | null) || {}
  const tr = locale !== "en" ? trMap[locale] : null

  return {
    id: post.id,
    slug: post.slug,
    title: tr?.title || post.title,
    description: tr?.description || post.description,
    body: tr?.body || post.body,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    coverImageUrl: post.coverImageUrl,
    ogImageUrl: post.ogImageUrl,
    tags: post.tags,
    seoTitle: tr?.seoTitle ?? post.seoTitle,
    seoDescription: tr?.seoDescription ?? post.seoDescription,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    readingMinutes: readingMinutes(tr?.body || post.body),
    locale
  }
}

export async function listPublishedPosts(locale: Locale): Promise<ResolvedPost[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
    })
    return posts.map((p) => resolveLocale(p, locale))
  } catch (err) {
    console.warn("[blog] listPublishedPosts failed — empty list:", (err as Error)?.message)
    return []
  }
}

export async function getPostBySlug(slug: string, locale: Locale): Promise<ResolvedPost | null> {
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug } })
    if (!post || post.status !== "PUBLISHED") return null
    return resolveLocale(post, locale)
  } catch (err) {
    console.warn("[blog] getPostBySlug failed:", (err as Error)?.message)
    return null
  }
}

export async function listAllPublishedSlugs(): Promise<string[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true }
    })
    return posts.map((p) => p.slug)
  } catch (err) {
    // Swallow the error so the build doesn't fail when the BlogPost
    // table is missing (fresh Neon branch, Vercel preview env without
    // migrations applied, etc.). The dynamic [slug] route still
    // server-renders on demand once the table exists.
    console.warn("[blog] listAllPublishedSlugs failed — returning empty list:", (err as Error)?.message)
    return []
  }
}

export async function listRelatedPosts(
  slug: string,
  tags: string[],
  locale: Locale,
  limit = 3
): Promise<ResolvedPost[]> {
  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: slug },
      ...(tags.length ? { tags: { hasSome: tags } } : {})
    },
    orderBy: { publishedAt: "desc" },
    take: limit
  })
  // Fallback: if no tag overlap returns anything, fill with most-recent.
  if (posts.length < limit) {
    const filler = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED", slug: { not: slug } },
      orderBy: { publishedAt: "desc" },
      take: limit
    })
    const seen = new Set(posts.map((p) => p.id))
    for (const f of filler) {
      if (posts.length >= limit) break
      if (!seen.has(f.id)) posts.push(f)
    }
  }
  return posts.map((p) => resolveLocale(p, locale))
}
