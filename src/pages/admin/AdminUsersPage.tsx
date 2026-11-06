import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getAdminUsers, type AdminUserRow, type Page, type Role } from '../../api'
import ReportProblemButton from '../../components/ReportProblemButton'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import { cardList, headRow, num, row, table, tableCard, td, th } from '../../components/tableStyles'
import { formatNumber } from '../../i18n'
import { formatTime, shortDate } from './format'
import { alertClass, secondaryButton } from './styles'

const EMPTY = { search: '', role: '', banned: '', page: '' }

// Owner violet, admin sky, user outlined: a word in each, never colour alone.
const ROLE_STYLE: Record<Role, string> = {
  owner: 'border-violet-700/40 bg-violet-500/10 text-violet-800 dark:border-violet-300/40 dark:text-violet-300',
  admin: 'border-sky-700/40 bg-sky-500/10 text-sky-800 dark:border-sky-300/40 dark:text-sky-300',
  user: 'border-field text-muted',
}

function RoleBadge({ role }: { role: Role }) {
  const { t } = useTranslation()
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${ROLE_STYLE[role]}`}>{t(`admin.roles.${role}`)}</span>
}

// A dot and the word: Active (pass), Banned (fail).
function Status({ banned }: { banned: boolean }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${banned ? 'text-fail' : 'text-pass'}`}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      {banned ? t('admin.common.banned') : t('admin.users.active')}
    </span>
  )
}

// Up to two initials from the name, in its own direction; decoration next to the name.
function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase()
  return (
    <span aria-hidden="true" dir="auto" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-hover text-xs font-semibold text-ink">
      {initials}
    </span>
  )
}

// The name (links to the user's page; the link covers the whole row) with the email under it.
function UserCell({ row: user }: { row: AdminUserRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={user.name} />
      <div className="min-w-0">
        <Link
          to={`/admin/users/${user.id}`}
          className="block truncate rounded font-semibold text-ink underline-offset-4 after:absolute after:inset-0 hover:underline"
          title={user.name}
        >
          <span dir="auto">{user.name}</span>
        </Link>
        <span title={user.email} className="block truncate text-xs text-muted">
          {user.email}
        </span>
      </div>
    </div>
  )
}

// /admin/users: search, filters and the page live in the address, so Back and links keep them.
export default function AdminUsersPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
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

  // A changed filter goes back to the first page, as the Search button did.
  function change(values: Partial<typeof filters>) {
    apply({ ...filters, ...values, page: '' })
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.users.title')}</h1>

      <FilterBar
        label={t('admin.common.filters')}
        search={{
          id: 'user-search',
          label: t('admin.users.search'),
          clearLabel: t('admin.common.clearSearch'),
          value: filters.search,
          onChange: (search) => change({ search }),
        }}
        selects={[
          {
            id: 'user-role',
            label: t('admin.users.role'),
            value: filters.role,
            onChange: (role) => change({ role }),
            options: [
              { value: '', label: t('admin.common.all') },
              { value: 'user', label: t('admin.roles.user') },
              { value: 'admin', label: t('admin.roles.admin') },
              { value: 'owner', label: t('admin.roles.owner') },
            ],
          },
          {
            id: 'user-banned',
            label: t('admin.users.status'),
            value: filters.banned,
            onChange: (banned) => change({ banned }),
            options: [
              { value: '', label: t('admin.users.all') },
              { value: '0', label: t('admin.users.notBanned') },
              { value: '1', label: t('admin.common.banned') },
            ],
          },
        ]}
        active={Boolean(filters.search || filters.role || filters.banned)}
        clearLabel={t('admin.common.clear')}
        onClear={() => apply(EMPTY)}
        meta={result ? t('admin.users.count', { count: result.total, formatted: formatNumber(result.total, 'en') }) : null}
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
      {!error && result === null && <p className="mt-4 text-muted">{t('admin.users.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.users.noMatch')}</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          {/* Cards on narrow screens, a table from md up. */}
          <ul className={cardList}>
            {result.data.map((user) => (
              <li key={user.id} className="relative space-y-2 px-4 py-3 hover:bg-hover">
                <UserCell row={user} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <RoleBadge role={user.role} />
                  <Status banned={user.banned_at !== null} />
                  <span className="font-mono tabular-nums">
                    {t('admin.users.points')} {formatNumber(user.points, 'en')}
                  </span>
                  <span className="font-mono tabular-nums">
                    {t('admin.users.solved')} {formatNumber(user.solved_count, 'en')}
                  </span>
                  <span title={formatTime(user.created_at)}>
                    {t('admin.users.joined')} {shortDate(user.created_at, t)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className={tableCard}>
            <table className={table}>
              <colgroup>
                <col />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-28" />
              </colgroup>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={th}>
                    {t('admin.activity.user')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.users.role')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.users.status')}
                  </th>
                  <th scope="col" className={`${th} text-end`}>
                    {t('admin.users.points')}
                  </th>
                  <th scope="col" className={`${th} text-end`}>
                    {t('admin.users.solved')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.users.joined')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((user) => (
                  <tr key={user.id} className={`${row} relative`}>
                    <td className={td}>
                      <UserCell row={user} />
                    </td>
                    <td className={td}>
                      <RoleBadge role={user.role} />
                    </td>
                    <td className={td}>
                      <Status banned={user.banned_at !== null} />
                    </td>
                    <td className={`${td} ${num}`}>{formatNumber(user.points, 'en')}</td>
                    <td className={`${td} ${num}`}>{formatNumber(user.solved_count, 'en')}</td>
                    <td className={`${td} text-muted`} title={formatTime(user.created_at)}>
                      {shortDate(user.created_at, t)}
                    </td>
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
