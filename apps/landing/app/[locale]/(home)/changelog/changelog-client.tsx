"use client"

import { useMemo, useState } from "react"
import s from "./changelog.module.scss"

type Tag = "feature" | "fix" | "chore"

export interface ChangelogEntry {
  date: string
  parsedDate: number // ms since epoch for sorting/grouping (passed pre-parsed)
  title: string
  tag: Tag
  bullets: string[]
}

interface Props {
  entries: ChangelogEntry[]
  labels: {
    all: string
    feature: string
    fix: string
    chore: string
    empty: string
  }
  /** Two-letter locale for Intl.DateTimeFormat month grouping. */
  locale: string
}

const TAGS: Tag[] = ["feature", "fix", "chore"]

export function ChangelogClient({ entries, labels, locale }: Props) {
  const [filter, setFilter] = useState<Tag | "all">("all")

  const counts = useMemo(
    () => ({
      all: entries.length,
      feature: entries.filter((e) => e.tag === "feature").length,
      fix: entries.filter((e) => e.tag === "fix").length,
      chore: entries.filter((e) => e.tag === "chore").length
    }),
    [entries]
  )

  const visible = useMemo(
    () => entries.filter((e) => filter === "all" || e.tag === filter),
    [entries, filter]
  )

  const monthFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, {
        month: "long",
        year: "numeric"
      }),
    [locale]
  )

  // Group entries by Year-Month for visual separation.
  const grouped = useMemo(() => {
    const out: { month: string; items: ChangelogEntry[] }[] = []
    for (const e of visible) {
      const key = monthFmt.format(new Date(e.parsedDate))
      const last = out[out.length - 1]
      if (last && last.month === key) last.items.push(e)
      else out.push({ month: key, items: [e] })
    }
    return out
  }, [visible, monthFmt])

  const tagLabel = (t: Tag) => labels[t]

  return (
    <>
      <div className={s.filters}>
        <button
          className={`${s.filterChip} ${filter === "all" ? s.active : ""}`}
          onClick={() => setFilter("all")}
        >
          {labels.all}
          <span className={s.count}>{counts.all}</span>
        </button>
        {TAGS.map((t) => (
          <button
            key={t}
            className={`${s.filterChip} ${filter === t ? s.active : ""}`}
            onClick={() => setFilter(t)}
          >
            {tagLabel(t)}
            <span className={s.count}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={s.empty}>{labels.empty}</p>
      ) : (
        <div className={s.list}>
          {grouped.map((group) => (
            <div key={group.month}>
              <div className={s.monthHeader}>{group.month}</div>
              {group.items.map((entry, i) => (
                <article key={`${group.month}-${i}`} className={`${s.entry} ${s[entry.tag]}`}>
                  <div className={s.head}>
                    <h2 className={s.title}>{entry.title}</h2>
                    <div className={s.meta}>
                      <span className={`${s.tag} ${s[entry.tag]}`}>{tagLabel(entry.tag)}</span>
                      <time>{entry.date}</time>
                    </div>
                  </div>
                  <ul className={s.bullets}>
                    {entry.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
