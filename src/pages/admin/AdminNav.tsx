import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { getBugReportSummary, getSecuritySummary } from '../../api'
import { useAuth } from '../../auth'
import { formatNumber } from '../../i18n'

// Underline tabs like the site nav: the current one ink with an accent bar under the word (not
// colour alone), the others muted.
const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded px-2 hover:text-ink ${isActive ? 'font-medium text-ink underline decoration-accent decoration-2 underline-offset-[6px]' : 'text-muted'}`

// Sent by the Security page after it marks events as seen, so the badge updates at once.
export const SECURITY_CHANGED = 'algoslab:security-changed'
// Sent by the Bug reports page after it opens, updates or deletes a report.
export const BUG_REPORTS_CHANGED = 'algoslab:bug-reports-changed'

const POLL_MS = 60_000

// The unseen security events and new unopened bug reports: loaded when the admin area opens, then
// every 60 seconds while the tab is visible (no requests from a hidden tab; one at once when it shows
// again). One timer for both badges.
function useUnseenCounts(enabled: boolean): { security: number; bugs: number } {
  const [counts, setCounts] = useState({ security: 0, bugs: 0 })
  useEffect(() => {
    if (!enabled) return
    let active = true
    let timer: number | undefined
    const load = () => {
      getSecuritySummary()
        .then((summary) => active && setCounts((old) => ({ ...old, security: summary.unseen })))
        .catch(() => {})
      getBugReportSummary()
        .then((summary) => active && setCounts((old) => ({ ...old, bugs: summary.unseen })))
        .catch(() => {})
    }
    const start = () => {
      load()
      timer = window.setInterval(load, POLL_MS)
    }
    const onVisibility = () => {
      window.clearInterval(timer)
      if (!document.hidden) start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(SECURITY_CHANGED, load)
    window.addEventListener(BUG_REPORTS_CHANGED, load)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(SECURITY_CHANGED, load)
      window.removeEventListener(BUG_REPORTS_CHANGED, load)
    }
  }, [enabled])
  return enabled ? counts : { security: 0, bugs: 0 }
}

// A count badge: the number (not a colour alone), "99+" above 99, nothing at 0; screen readers hear
// the label, e.g. "Security 5 unseen events".
function Badge({ count, many, label }: { count: number; many: string; label: (count: number) => string }) {
  if (count <= 0) return null
  return (
    <>
      {' '}
      <span className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fail px-1.5 font-mono text-xs leading-none font-semibold text-inverse tabular-nums">
        {count > 99 ? many : formatNumber(count, 'en')}
      </span>
      <span className="sr-only">{label(count > 99 ? 100 : count)}</span>
    </>
  )
}

// The admin area's tabs. In the admin chunk (with the Security badge and its polling), so the main
// bundle does not carry them.
export default function AdminNav() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const owner = user?.role === 'owner'
  const unseen = useUnseenCounts(owner)

  return (
    <nav aria-label={t('admin.nav.label')} className="mb-6 flex flex-wrap gap-x-2 border-b border-line pb-1">
      <NavLink to="/admin" end className={tabClass}>
        {t('admin.nav.content')}
      </NavLink>
      <NavLink to="/admin/users" className={tabClass}>
        {t('admin.nav.users')}
      </NavLink>
      {owner && (
        <>
          <NavLink to="/admin/audit-log" className={tabClass}>
            {t('admin.nav.auditLog')}
          </NavLink>
          <NavLink to="/admin/activity" className={tabClass}>
            {t('admin.nav.activity')}
          </NavLink>
          {/* The badge is the number, not a colour alone; screen readers hear "Security 5 unseen events". */}
          <NavLink to="/admin/security" className={tabClass}>
            {t('admin.nav.security')}
            <Badge count={unseen.security} many={t('admin.nav.securityMany')} label={(count) => t('admin.nav.securityUnseen', { count })} />
          </NavLink>
          <NavLink to="/admin/bug-reports" className={tabClass}>
            {t('admin.nav.bugReports')}
            <Badge count={unseen.bugs} many={t('admin.nav.securityMany')} label={(count) => t('admin.nav.bugReportsUnseen', { count })} />
          </NavLink>
        </>
      )}
    </nav>
  )
}
