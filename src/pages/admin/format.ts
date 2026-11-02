import type { TFunction } from 'i18next'

// Shared by the admin user, users, audit log and activity pages.

// The admin area is English; local time as 2026-10-20 01:03:42 (the sv-SE format).
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE')
}

// The activity events; each one's label is the key admin.events.<event>.
export const EVENTS = ['register', 'login', 'login_failed', 'login_blocked_banned', 'logout', 'banned_by_admin', 'unbanned']

// Shared class for the filter inputs.
export const controlClass = 'mt-1 block w-full rounded border border-field bg-surface px-3 py-2 text-ink hover:border-muted'

const DAY_MS = 24 * 60 * 60 * 1000

// "Nov 2", or "Nov 2, 2025" outside the current year; YYYY-MM-DD read as a UTC day.
function monthDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear()
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric', timeZone: 'UTC' })
}

// The chip text of a From/To filter (UTC days, both ends included).
export function dateRangeSummary(from: string, to: string, t: TFunction): string {
  if (from && to) return from === to ? monthDay(from) : `${monthDay(from)} – ${monthDay(to)}`
  if (from) return t('admin.common.sinceDate', { date: monthDay(from) })
  if (to) return t('admin.common.untilDate', { date: monthDay(to) })
  return t('admin.common.all')
}

// Rows grouped by their UTC day, the days the date filters use, in the order they come (newest
// first). Each group's heading: "Today · Nov 2", "Yesterday · Nov 1", then "Fri, Oct 30".
export function groupByUtcDay<T extends { created_at: string }>(rows: T[], t: TFunction): { day: string; heading: string; rows: T[] }[] {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)
  const groups: { day: string; heading: string; rows: T[] }[] = []
  for (const row of rows) {
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    let group = groups.at(-1)
    if (!group || group.day !== day) {
      const date = new Date(`${day}T00:00:00Z`)
      const heading =
        day === today
          ? t('admin.common.todayDate', { date: monthDay(day) })
          : day === yesterday
            ? t('admin.common.yesterdayDate', { date: monthDay(day) })
            : date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: date.getUTCFullYear() === new Date().getUTCFullYear() ? undefined : 'numeric',
                timeZone: 'UTC',
              })
      group = { day, heading, rows: [] }
      groups.push(group)
    }
    group.rows.push(row)
  }
  return groups
}

// A local calendar date for a list: "Today", "Oct 28", or "Oct 28, 2025" outside this year.
export function shortDate(iso: string, t: TFunction): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return t('admin.common.today')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

// A short browser label from a user agent: "Chrome 156 · Windows", "Firefox 140 · Linux",
// "Safari · macOS". Hand-written, for the common browsers only; null when nothing is recognised.
export function browserLabel(userAgent: string): string | null {
  const ua = userAgent
  const version = (pattern: RegExp) => ua.match(pattern)?.[1]
  // Order matters: Edge, Opera and Samsung say "Chrome" too, Chrome says "Safari".
  let browser: string | null = null
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = `Edge ${version(/Edg(?:e|A|iOS)?\/(\d+)/)}`
  else if (/OPR\/|Opera/.test(ua)) browser = `Opera ${version(/(?:OPR|Opera)\/(\d+)/) ?? ''}`.trim()
  else if (/SamsungBrowser\//.test(ua)) browser = `Samsung Internet ${version(/SamsungBrowser\/(\d+)/)}`
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = `Firefox ${version(/(?:Firefox|FxiOS)\/(\d+)/)}`
  else if (/Chrome\/|CriOS\//.test(ua)) browser = `Chrome ${version(/(?:Chrome|CriOS)\/(\d+)/)}`
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari'

  let os: string | null = null
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/CrOS/.test(ua)) os = 'ChromeOS'
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  if (!browser) return null
  return os ? `${browser} · ${os}` : browser
}
