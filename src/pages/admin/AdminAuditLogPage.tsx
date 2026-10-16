import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, getAuditLog, type AuditEntry, type Page } from '../../api'
import Pagination from '../../components/Pagination'
import { controlClass, formatTime } from './format'
import { alertClass, primaryButton, secondaryButton } from './styles'

const ACTIONS = [
  'module.create', 'module.update', 'module.delete',
  'lesson.create', 'lesson.update', 'lesson.delete',
  'problem.create', 'problem.update', 'problem.delete',
  'test_case.create', 'test_case.update', 'test_case.delete',
  'user.ban', 'user.unban', 'user.logout_everywhere', 'user.role_change',
  'user.points_adjust', 'user.reset_progress', 'user.delete',
]

const EMPTY = { action: '', actor: '', from: '', to: '', page: '' }

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

// details as readable lines: "title: Old -> New", "body changed", "reason: Spam".
function detailLines(details: AuditEntry['details']): string[] {
  if (!details) return []
  return Object.entries(details).flatMap(([key, value]) => {
    if (key === 'changes' && value && typeof value === 'object') {
      const changes = Object.entries(value as Record<string, unknown>)
      if (changes.length === 0) return ['No fields changed']
      return changes.map(([field, change]) => {
        if (change === 'changed') return `${field} changed`
        const { old, new: next } = change as { old: unknown; new: unknown }
        return `${field}: ${show(old)} → ${show(next)}`
      })
    }
    return [`${key.replaceAll('_', ' ')}: ${show(value)}`]
  })
}

function Details({ details }: { details: AuditEntry['details'] }) {
  const lines = detailLines(details)
  if (lines.length === 0) return <span className="text-muted">-</span>
  return (
    <ul className="space-y-0.5">
      {lines.map((line, index) => (
        <li key={index} className="break-words">
          {line}
        </li>
      ))}
    </ul>
  )
}

// /admin/audit-log, owners only (OwnerRoute). Read-only: rows can't be edited or deleted.
export default function AdminAuditLogPage() {
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const [form, setForm] = useState(filters)
  const [result, setResult] = useState<Page<AuditEntry> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAuditLog(Object.fromEntries(new URLSearchParams(key)))
      .then((page) => {
        if (active) {
          setResult(page)
          setError('')
        }
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : 'Could not load the audit log.'))
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
      <h1 className="text-3xl font-semibold tracking-tight">Admin: audit log</h1>
      <p className="mt-2 text-muted">Every change made by an admin or owner, newest first. Times are in your timezone; the date filters use UTC days.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="audit-action" className="text-sm font-medium">
            Action
          </label>
          <select id="audit-action" value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value })} className={controlClass}>
            <option value="">All actions</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-actor" className="text-sm font-medium">
            Actor (id, email or console)
          </label>
          <input id="audit-actor" type="text" value={form.actor} onChange={(event) => setForm({ ...form, actor: event.target.value })} className={controlClass} />
        </div>
        <div>
          <label htmlFor="audit-from" className="text-sm font-medium">
            From
          </label>
          <input id="audit-from" type="date" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} className={controlClass} />
        </div>
        <div>
          <label htmlFor="audit-to" className="text-sm font-medium">
            To
          </label>
          <input id="audit-to" type="date" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} className={controlClass} />
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
      {!error && result === null && <p className="mt-6 text-muted">Loading the audit log...</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-6 rounded border border-line bg-surface px-4 py-6 text-center text-muted">No entries match these filters.</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          <ul className="mt-6 divide-y divide-line rounded border border-line bg-surface md:hidden">
            {result.data.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="font-mono font-medium">{entry.action}</p>
                <p className="mt-1 break-words">
                  {entry.target_type} {entry.target_id}: {entry.target_label}
                </p>
                <div className="mt-1">
                  <Details details={entry.details} />
                </div>
                <p className="mt-1 break-all text-muted">
                  {entry.actor_email} · {formatTime(entry.created_at)} · {entry.ip ?? 'no IP'}
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
                    Actor
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Action
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Target
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Details
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {result.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-muted">{formatTime(entry.created_at)}</td>
                    <td className="break-all px-3 py-2">{entry.actor_email}</td>
                    <td className="px-3 py-2 font-mono">{entry.action}</td>
                    <td className="break-words px-3 py-2">
                      {entry.target_type} {entry.target_id}: {entry.target_label}
                    </td>
                    <td className="px-3 py-2">
                      <Details details={entry.details} />
                    </td>
                    <td className="px-3 py-2 text-muted">{entry.ip ?? '-'}</td>
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
