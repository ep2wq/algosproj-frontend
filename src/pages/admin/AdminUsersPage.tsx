import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getAdminUsers, type AdminUserRow, type Page } from '../../api'
import BannedBadge from '../../components/BannedBadge'
import Pagination from '../../components/Pagination'
import { controlClass, formatTime } from './format'
import { alertClass, primaryButton, secondaryButton } from './styles'

const EMPTY = { search: '', role: '', banned: '', page: '' }

// /admin/users: search, filters and the page live in the address, so Back and links keep them.
export default function AdminUsersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const [form, setForm] = useState(filters)
  const [result, setResult] = useState<Page<AdminUserRow> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminUsers(Object.fromEntries(new URLSearchParams(key)))
      .then((page) => {
        if (active) {
          setResult(page)
          setError('')
        }
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : t('admin.users.loadFailed')))
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

  function clear() {
    setForm(EMPTY)
    apply(EMPTY)
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.users.title')}</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="user-search" className="text-sm font-medium">
            {t('admin.users.search')}
          </label>
          <input
            id="user-search"
            type="search"
            value={form.search}
            onChange={(event) => setForm({ ...form, search: event.target.value })}
            className={controlClass}
          />
        </div>
        <div>
          <label htmlFor="user-role" className="text-sm font-medium">
            {t('admin.users.role')}
          </label>
          <select id="user-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className={controlClass}>
            <option value="">{t('admin.users.allRoles')}</option>
            <option value="user">{t('admin.roles.user')}</option>
            <option value="admin">{t('admin.roles.admin')}</option>
            <option value="owner">{t('admin.roles.owner')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="user-banned" className="text-sm font-medium">
            {t('admin.users.status')}
          </label>
          <select
            id="user-banned"
            value={form.banned}
            onChange={(event) => setForm({ ...form, banned: event.target.value })}
            className={controlClass}
          >
            <option value="">{t('admin.users.all')}</option>
            <option value="0">{t('admin.users.notBanned')}</option>
            <option value="1">{t('admin.common.banned')}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={primaryButton}>
            {t('admin.users.searchButton')}
          </button>
          <button type="button" onClick={clear} className={secondaryButton}>
            {t('admin.common.clearFilters')}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className={`mt-6 ${alertClass}`}>
          {error}
        </p>
      )}
      {!error && result === null && <p className="mt-6 text-muted">{t('admin.users.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-6 rounded border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.users.noMatch')}</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          {/* Cards on narrow screens, a table from md up. */}
          <ul className="mt-6 divide-y divide-line rounded border border-line bg-surface md:hidden">
            {result.data.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/users/${row.id}`} className="min-w-0 break-words rounded font-medium text-accent hover:underline">
                    <span dir="auto">{row.name}</span>
                  </Link>
                  {row.banned_at && <BannedBadge />}
                </div>
                <p className="mt-1 break-all text-sm">{row.email}</p>
                <p className="mt-1 text-sm text-muted tabular-nums">
                  {t('admin.users.card', { role: t(`admin.roles.${row.role}`), points: row.points, solved: row.solved_count, joined: formatTime(row.created_at) })}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded border border-line bg-surface md:block">
            <table className="w-full text-start">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t('admin.users.name')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t('admin.users.email')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t('admin.users.role')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t('admin.users.status')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-end font-medium">
                    {t('admin.users.points')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-end font-medium">
                    {t('admin.users.solved')}
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    {t('admin.users.joined')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.data.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2">
                      <Link to={`/admin/users/${row.id}`} className="rounded text-accent hover:underline">
                        <span dir="auto">{row.name}</span>
                      </Link>
                    </td>
                    <td className="break-all px-4 py-2 text-sm">{row.email}</td>
                    <td className="px-4 py-2 text-sm">{t(`admin.roles.${row.role}`)}</td>
                    <td className="px-4 py-2">{row.banned_at ? <BannedBadge /> : <span className="text-sm text-muted">{t('admin.users.active')}</span>}</td>
                    <td className="px-4 py-2 text-end tabular-nums">{row.points}</td>
                    <td className="px-4 py-2 text-end tabular-nums">{row.solved_count}</td>
                    <td className="px-4 py-2 text-sm text-muted">{formatTime(row.created_at)}</td>
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
