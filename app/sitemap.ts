import type { MetadataRoute } from "next"
import { DEFAULT_LOCALE, LOCALES, localePath } from "@/lib/i18n"

const BASE_URL = "https://kalit.ai"

const PAGES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/register", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/project", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/flow", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/marketing", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/pentest", changeFrequency: "weekly" as const, priority: 0.8 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const page of PAGES) {
    for (const locale of LOCALES) {
      const languages: Record<string, string> = {}
      for (const alt of LOCALES) {
        languages[alt] = `${BASE_URL}${localePath(page.path, alt)}`
      }
      languages["x-default"] = `${BASE_URL}${localePath(page.path, DEFAULT_LOCALE)}`

      entries.push({
        url: `${BASE_URL}${localePath(page.path, locale)}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages },
      })
    }
  }

  return entries
}
