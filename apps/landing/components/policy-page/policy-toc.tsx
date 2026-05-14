"use client"

import { useEffect, useState } from "react"
import s from "./policy-page.module.scss"

export interface PolicyTocItem {
  id: string
  label: string
}

interface Props {
  items: PolicyTocItem[]
  title: string
}

export function PolicyToc({ items, title }: Props) {
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
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    )
    items.forEach((it) => {
      const el = document.getElementById(it.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  if (!items.length) return null
  return (
    <aside className={s.toc} aria-label={title}>
      <div className={s.tocTitle}>{title}</div>
      <ul className={s.tocList}>
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} className={activeId === it.id ? s.active : undefined}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
