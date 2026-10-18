import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getActivity, type ActivityEntry, type Page } from '../../api'
import Pagination from '../../components/Pagination'
import { controlClass, EVENTS, formatTime } from './format'
import { alertClass, primaryButton, secondaryButton } from './styles'

const EMPTY = { event: '', user: '', from: '', to: '', page: '' }

function Who({ entry }: { entry: ActivityEntry }) {
  // A failed login with an unknown email, or a deleted account, has no user to link to.
  if (entry.user_id === null) return <span className="break-all">{entry.email}</span>
  return (
    <Link to={`/admin/users/${entry.user_id}`} className="break-all rounded text-accent hover:underline">
      {entry.email}
    </Link>
  )
}

// /admin/activity, owners only (OwnerRoute): every user's register, login, logout and ban events.
export default function AdminActivityPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const [form, setForm] = useState(filters)
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    apply({ ...form, page: '' })
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.activity.title')}</h1>
      <p className="mt-2 text-muted">{t('admin.activity.intro')}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="activity-event" className="text-sm font-medium">
            {t('admin.activity.event')}
          </label>
          <select id="activity-event" value={form.event} onChange={(event) => setForm({ ...form, event: event.target.value })} className={controlClass}>
            <option value="">{t('admin.activity.allEvents')}</option>
            {EVENTS.map((value) => (
              <option key={value} value={value}>
                {t(`admin.events.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="activity-user" className="text-sm font-medium">
            {t('admin.activity.userFilter')}
          </label>
          <input id="activity-user" type="text" value={form.user} onChange={(event) => setForm({ ...form, user: event.target.value })} className={controlClass} />
        </div>
        <div>
          <label htmlFor="activity-from" className="text-sm font-medium">
            {t('admin.common.from')}
          </label>
          <input id="activity-from" type="date" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} className={controlClass} />
        </div>
        <div>
          <label htmlFor="activity-to" className="text-sm font-medium">
            {t('admin.common.to')}
          </label>
          <input id="activity-to" type="date" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} className={controlClass} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={primaryButton}>
            {t('admin.common.filter')}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY)
              apply(EMPTY)
            }}
            className={secondaryButton}
          >
            {t('admin.common.clearFilters')}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className={`mt-6 ${alertClass}`}>
          {error}
        </p>
      )}
      {!error && result === null && <p className="mt-6 text-muted">{t('admin.activity.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-6 rounded border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.activity.noMatch')}</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          <ul className="mt-6 divide-y divide-line rounded border border-line bg-surface md:hidden">
            {result.data.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{t(`admin.events.${entry.event}`, { defaultValue: entry.event })}</p>
                <p className="mt-1">
                  <Who entry={entry} />
                </p>
                <p className="mt-1 break-all text-muted">
                  {formatTime(entry.created_at)} · {entry.ip ?? t('admin.common.noIp')} · {entry.user_agent ?? t('admin.common.noBrowser')}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded border border-line bg-surface md:block">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t('admin.common.time')}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t('admin.activity.event')}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t('admin.activity.user')}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t('admin.common.ip')}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t('admin.activity.browser')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {result.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-muted">{formatTime(entry.created_at)}</td>
                    <td className="px-3 py-2">{t(`admin.events.${entry.event}`, { defaultValue: entry.event })}</td>
                    <td className="px-3 py-2">
                      <Who entry={entry} />
                    </td>
                    <td className="px-3 py-2 text-muted">{entry.ip ?? '-'}</td>
                    <td className="break-all px-3 py-2 text-muted">{entry.user_agent ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
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
