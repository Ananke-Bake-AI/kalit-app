const MS_PER_DAY = 86_400_000

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function formatTime(iso: string, locale: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d)
}

export function formatRelative(iso: string, locale: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const diffSec = Math.round((now.getTime() - d.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  const abs = Math.abs(diffSec)
  if (abs < 45) return rtf.format(-diffSec, "second")
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute")
  const diffHour = Math.round(diffSec / 3600)
  if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, "hour")
  const diffDay = Math.round(diffSec / 86400)
  if (Math.abs(diffDay) < 7) return rtf.format(-diffDay, "day")

  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d)
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d)
}

export function formatDaySeparator(iso: string, locale: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / MS_PER_DAY)

  if (diffDays === 0 || diffDays === 1) {
    return capitalize(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-diffDays, "day"))
  }
  if (diffDays > 1 && diffDays < 7) {
    return capitalize(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(d))
  }
  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(d)
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(d)
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export type DateBucket = "today" | "yesterday" | "last7" | "last30" | "older"

export function dateBucket(iso: string, now: Date = new Date()): DateBucket {
  const d = new Date(iso)
  const diffDays = Math.floor((startOfDay(now).getTime() - startOfDay(d).getTime()) / MS_PER_DAY)
  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return "last7"
  if (diffDays < 30) return "last30"
  return "older"
}
