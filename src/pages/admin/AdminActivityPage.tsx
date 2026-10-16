import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getActivity, type ActivityEntry, type Page } from '../../api'
import Pagination from '../../components/Pagination'
import { controlClass, EVENT_LABELS, formatTime } from './format'
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
      .catch((err) => active && setError(err instanceof ApiError ? err.message : 'Could not load the activity.'))
    return () => {
      active = false
    }
  }, [key])

  function apply(next: typeof filters) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    apply({ ...form, page: '' })
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">Admin: activity</h1>
      <p className="mt-2 text-muted">Registrations, logins, logouts and bans, newest first. The date filters use UTC days.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="activity-event" className="text-sm font-medium">
            Event
          </label>
          <select id="activity-event" value={form.event} onChange={(event) => setForm({ ...form, event: event.target.value })} className={controlClass}>
            <option value="">All events</option>
            {Object.entries(EVENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="activity-user" className="text-sm font-medium">
            User (id or email)
          </label>
          <input id="activity-user" type="text" value={form.user} onChange={(event) => setForm({ ...form, user: event.target.value })} className={controlClass} />
        </div>
        <div>
          <label htmlFor="activity-from" className="text-sm font-medium">
            From
          </label>
          <input id="activity-from" type="date" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} className={controlClass} />
        </div>
        <div>
          <label htmlFor="activity-to" className="text-sm font-medium">
            To
          </label>
          <input id="activity-to" type="date" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} className={controlClass} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={primaryButton}>
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY)
              apply(EMPTY)
            }}
            className={secondaryButton}
          >
            Clear filters
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className={`mt-6 ${alertClass}`}>
          {error}
        </p>
      )}
      {!error && result === null && <p className="mt-6 text-muted">Loading activity...</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-6 rounded border border-line bg-surface px-4 py-6 text-center text-muted">No activity matches these filters.</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          <ul className="mt-6 divide-y divide-line rounded border border-line bg-surface md:hidden">
            {result.data.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{EVENT_LABELS[entry.event] ?? entry.event}</p>
                <p className="mt-1">
                  <Who entry={entry} />
                </p>
                <p className="mt-1 break-all text-muted">
                  {formatTime(entry.created_at)} · {entry.ip ?? 'no IP'} · {entry.user_agent ?? 'no browser'}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded border border-line bg-surface md:block">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Time
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Event
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    IP
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Browser
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {result.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-muted">{formatTime(entry.created_at)}</td>
                    <td className="px-3 py-2">{EVENT_LABELS[entry.event] ?? entry.event}</td>
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
