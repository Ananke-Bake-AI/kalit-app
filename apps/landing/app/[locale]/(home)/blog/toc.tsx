"use client"

import { useEffect, useState } from "react"
import s from "./blog.module.scss"

interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

interface TocProps {
  items: TocItem[]
}

export function Toc({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id || null)

  useEffect(() => {
    if (!items.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    )
    items.forEach((it) => {
      const el = document.getElementById(it.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  if (!items.length) return null

  return (
    <aside className={s.toc} aria-label="Table of contents">
      <div className={s.tocTitle}>On this page</div>
      <ul className={s.tocList}>
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? s.h3 : undefined}>
            <a href={`#${it.id}`} className={activeId === it.id ? s.active : undefined}>
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
