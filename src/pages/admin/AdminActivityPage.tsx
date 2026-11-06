import { Ban, KeyRound, LogIn, LogOut, ShieldCheck, ShieldX, UserPlus, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getActivity, type ActivityEntry, type Page } from '../../api'
import ReportProblemButton from '../../components/ReportProblemButton'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import { cardList, headRow, row, rowLink, table, tableCard, td, th, truncate } from '../../components/tableStyles'
import { formatNumber } from '../../i18n'
import { browserLabel, dateRangeSummary, EVENTS, groupByUtcDay } from './format'
import UtcClock from './UtcClock'
import { alertClass, secondaryButton } from './styles'

const EMPTY = { event: '', user: '', from: '', to: '', page: '' }

// Each event as a chip with an icon and its word, never colour alone. Login sky, registration pass,
// bans fail, the rest muted.
const INFO = 'border-sky-700/40 bg-sky-500/10 text-sky-800 dark:border-sky-300/40 dark:text-sky-300'
const PASS = 'border-pass/40 bg-pass/10 text-pass'
const FAIL = 'border-fail/40 bg-fail/10 text-fail'
const MUTED = 'border-line text-muted'
const EVENT_STYLE: Record<string, [LucideIcon, string]> = {
  login: [LogIn, INFO],
  logout: [LogOut, MUTED],
  register: [UserPlus, PASS],
  banned_by_admin: [Ban, FAIL],
  login_blocked_banned: [ShieldX, FAIL],
  login_failed: [KeyRound, MUTED],
  unbanned: [ShieldCheck, MUTED],
}

function EventChip({ event }: { event: string }) {
  const { t } = useTranslation()
  const [Icon, style] = EVENT_STYLE[event] ?? [KeyRound, MUTED]
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${style}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{t(`admin.events.${event}`, { defaultValue: event })}</span>
    </span>
  )
}

function Who({ entry }: { entry: ActivityEntry }) {
  const { t } = useTranslation()
  const email = entry.email ?? t('admin.common.unknown')
  // A failed login with an unknown email, or a deleted account, has no user to link to.
  if (entry.user_id === null)
    return (
      <span title={email} className={`${truncate} text-ink`}>
        {email}
      </span>
    )
  return (
    <Link to={`/admin/users/${entry.user_id}`} title={email} className={`${rowLink} ${truncate}`}>
      {email}
    </Link>
  )
}

// "Chrome 156 · Windows"; the whole user agent in the title and for screen readers.
function Browser({ userAgent }: { userAgent: string | null }) {
  const { t } = useTranslation()
  if (userAgent === null) return <span className="text-muted">-</span>
  return (
    <span title={userAgent} className={`${truncate} text-muted`}>
      <span aria-hidden="true">{browserLabel(userAgent) ?? t('admin.common.unknown')}</span>
      <span className="sr-only">{userAgent}</span>
    </span>
  )
}

// /admin/activity, owners only (OwnerRoute): every user's register, login, logout and ban events.
export default function AdminActivityPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const [result, setResult] = useState<Page<ActivityEntry> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getActivity(Object.fromEntries(new URLSearchParams(key)))
      .then((page) => {
        if (active) {
          setResult(page)
          setError('')
        }
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : t('admin.activity.loadFailed')))
    return () => {
      active = false
    }
  }, [key, t])

  function apply(next: typeof filters) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
  }

  // A changed filter goes back to the first page, as the Filter button did.
  function change(values: Partial<typeof filters>) {
    apply({ ...filters, ...values, page: '' })
  }

  const groups = result ? groupByUtcDay(result.data, t) : []

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.activity.title')}</h1>
      <p className="mt-2 text-muted">{t('admin.activity.intro')}</p>

      <FilterBar
        label={t('admin.common.filters')}
        search={{
          id: 'activity-user',
          label: t('admin.activity.userFilter'),
          clearLabel: t('admin.common.clearSearch'),
          value: filters.user,
          onChange: (user) => change({ user }),
        }}
        selects={[
          {
            id: 'activity-event',
            label: t('admin.activity.event'),
            value: filters.event,
            onChange: (event) => change({ event }),
            options: [{ value: '', label: t('admin.common.all') }, ...EVENTS.map((value) => ({ value, label: t(`admin.events.${value}`) }))],
          },
        ]}
        date={{
          label: t('admin.common.date'),
          fromLabel: t('admin.common.from'),
          toLabel: t('admin.common.to'),
          from: filters.from,
          to: filters.to,
          summary: dateRangeSummary(filters.from, filters.to, t),
          onChange: (from, to) => change({ from, to }),
        }}
        active={Boolean(filters.user || filters.event || filters.from || filters.to)}
        clearLabel={t('admin.common.clear')}
        onClear={() => apply(EMPTY)}
        meta={result ? t('admin.common.results', { count: result.total, formatted: formatNumber(result.total, 'en') }) : null}
        metaEnd={result && result.last_page > 1 ? t('admin.common.pageOf', { page: result.current_page, pages: result.last_page }) : null}
      />

      {error && (
        <>
          <p role="alert" className={`mt-4 ${alertClass}`}>
            {error}
          </p>
          <ReportProblemButton context={{ message: error }} className={`mt-2 ${secondaryButton}`} />
        </>
      )}
      {!error && result === null && <p className="mt-4 text-muted">{t('admin.activity.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.activity.noMatch')}</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          <div className={cardList}>
            {groups.map((group) => (
              <section key={group.day} aria-label={group.heading}>
                <h2 className="bg-hover/60 px-4 py-1.5 text-xs font-medium text-muted">{group.heading}</h2>
                <ul className="divide-y divide-line border-t border-line">
                  {group.rows.map((entry) => (
                    <li key={entry.id} className="space-y-1 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <EventChip event={entry.event} />
                        <UtcClock iso={entry.created_at} />
                      </div>
                      <Who entry={entry} />
                      <div className="flex min-w-0 items-center gap-2 text-xs">
                        <span className="shrink-0 font-mono text-muted">{entry.ip ?? t('admin.common.noIp')}</span>
                        <span aria-hidden="true" className="text-muted">·</span>
                        <span className="min-w-0">
                          <Browser userAgent={entry.user_agent} />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className={tableCard}>
            <table className={table}>
              <colgroup>
                <col className="w-28" />
                <col className="w-52" />
                <col />
                <col className="w-36" />
                <col className="w-48" />
              </colgroup>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={th}>
                    {t('admin.common.time')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.activity.event')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.activity.user')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.common.ip')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.activity.browser')}
                  </th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.day}>
                  <tr className="border-b border-line bg-hover/40">
                    <th scope="colgroup" colSpan={5} className="px-3 py-1.5 text-xs font-medium text-muted">
                      {group.heading}
                    </th>
                  </tr>
                  {group.rows.map((entry) => (
                    <tr key={entry.id} className={row}>
                      <td className={td}>
                        <UtcClock iso={entry.created_at} />
                      </td>
                      <td className={td}>
                        <EventChip event={entry.event} />
                      </td>
                      <td className={td}>
                        <Who entry={entry} />
                      </td>
                      <td className={`${td} font-mono text-xs text-muted`}>
                        <span title={entry.ip ?? undefined} className={truncate}>
                          {entry.ip ?? '-'}
                        </span>
                      </td>
                      <td className={td}>
                        <Browser userAgent={entry.user_agent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <Pagination
            page={result.current_page}
            lastPage={result.last_page}
            total={result.total}
            onPage={(page) => apply({ ...filters, page: String(page) })}
          />
        </>
      )}
    </div>
  )
}
