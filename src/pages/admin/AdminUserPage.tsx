import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  adjustUserPoints,
  ApiError,
  banUser,
  deleteUser,
  getAdminUser,
  getUserActivity,
  logoutUserEverywhere,
  resetUserProgress,
  setUserRole,
  unbanUser,
  type ActivityEntry,
  type AdminUserDetail,
  type Page,
} from '../../api'
import { useAuth } from '../../auth'
import BannedBadge from '../../components/BannedBadge'
import ConfirmAction from '../../components/ConfirmAction'
import Pagination from '../../components/Pagination'
import { controlClass, formatTime } from './format'
import { alertClass } from './styles'

// /admin/users/:id. Only the actions the current role may use are shown; the backend checks
// every one of them again (403 with a message, shown next to the action).
export default function AdminUserPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const userId = Number(id)
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [activity, setActivity] = useState<Page<ActivityEntry> | null>(null)
  const [activityPage, setActivityPage] = useState(1)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [banReason, setBanReason] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [amount, setAmount] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')

  const load = useCallback(() => {
    getAdminUser(userId)
      .then((user) => {
        setDetail(user)
        setRole(user.role === 'admin' ? 'admin' : 'user')
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError && err.status === 404 ? t('admin.user.notFound') : err instanceof ApiError ? err.message : t('admin.user.loadFailed')),
      )
  }, [userId, t])

  const loadActivity = useCallback(() => {
    getUserActivity(userId, activityPage)
      .then(setActivity)
      .catch(() => {
        // The rest of the page still shows; the section says it could not load.
        setActivity(null)
      })
  }, [userId, activityPage])

  useEffect(load, [load])
  useEffect(loadActivity, [loadActivity])

  // After an action: show what happened and reload the user and their activity.
  function done(message: string) {
    setNotice(message)
    load()
    loadActivity()
  }

  if (loadError) {
    return (
      <div className="max-w-prose">
        <p role="alert" className={alertClass}>
          {loadError}
        </p>
        <Link to="/admin/users" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          {t('admin.user.backToUsers')}
        </Link>
      </div>
    )
  }

  if (!detail || !me) return <p className="text-muted">{t('admin.user.loading')}</p>

  // The same rules as the backend: never yourself, never an owner, and admins only act on users.
  const isSelf = me.id === detail.id
  const canModerate = !isSelf && detail.role !== 'owner' && (me.role === 'owner' || detail.role === 'user')
  const ownerActions = me.role === 'owner' && !isSelf && detail.role !== 'owner'

  return (
    <div className="max-w-4xl">
      <Link to="/admin/users" className="rounded text-sm text-muted hover:text-accent">
        {t('admin.nav.users')}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight" dir="auto">
          {detail.name}
        </h1>
        {detail.banned_at && <BannedBadge />}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 rounded border border-line bg-surface p-4 sm:grid-cols-[auto_1fr]">
        <dt className="text-sm text-muted">{t('admin.users.email')}</dt>
        <dd className="break-all">{detail.email}</dd>
        <dt className="text-sm text-muted">{t('admin.users.role')}</dt>
        <dd>{t(`admin.roles.${detail.role}`)}</dd>
        <dt className="text-sm text-muted">{t('admin.users.points')}</dt>
        <dd className="tabular-nums">{detail.points}</dd>
        <dt className="text-sm text-muted">{t('admin.users.solved')}</dt>
        <dd className="tabular-nums">{detail.solved_count}</dd>
        <dt className="text-sm text-muted">{t('admin.users.joined')}</dt>
        <dd>{formatTime(detail.created_at)}</dd>
        {detail.banned_at && (
          <>
            <dt className="text-sm text-muted">{t('admin.common.banned')}</dt>
            <dd className="break-words">{t('admin.user.bannedAt', { time: formatTime(detail.banned_at), reason: detail.ban_reason ?? '' })}</dd>
          </>
        )}
      </dl>

      <section className="mt-8" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-xl font-semibold">
          {t('admin.user.actions')}
        </h2>
        {notice && (
          <p role="status" className="mt-2 text-pass">
            {notice}
          </p>
        )}
        {!canModerate && !ownerActions && (
          <p className="mt-2 text-sm text-muted">
            {isSelf ? t('admin.user.notSelf') : detail.role === 'owner' ? t('admin.user.notOwner') : t('admin.user.onlyOwner')}
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {canModerate &&
            (detail.banned_at ? (
              <ConfirmAction
                label={t('admin.user.unban')}
                question={t('admin.user.unbanQuestion', { name: detail.name })}
                confirmLabel={t('admin.user.unbanConfirm')}
                onConfirm={async () => {
                  await unbanUser(detail.id)
                  done(t('admin.user.unbanned'))
                }}
              />
            ) : (
              <ConfirmAction
                label={t('admin.user.ban')}
                question={t('admin.user.banQuestion', { name: detail.name })}
                confirmLabel={t('admin.user.banConfirm')}
                danger
                onClose={() => setBanReason('')}
                onConfirm={async () => {
                  await banUser(detail.id, banReason)
                  done(t('admin.user.banned'))
                }}
              >
                <div>
                  <label htmlFor="ban-reason" className="text-sm font-medium">
                    {t('admin.user.banReason')}
                  </label>
                  <textarea
                    id="ban-reason"
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    rows={3}
                    maxLength={255}
                    className={controlClass}
                  />
                </div>
              </ConfirmAction>
            ))}
          {canModerate && (
            <ConfirmAction
              label={t('admin.user.logoutEverywhere')}
              question={t('admin.user.logoutQuestion', { name: detail.name })}
              confirmLabel={t('admin.user.logoutConfirm')}
              onConfirm={async () => {
                await logoutUserEverywhere(detail.id)
                done(t('admin.user.loggedOut'))
              }}
            />
          )}
          {ownerActions && (
            <ConfirmAction
              label={t('admin.user.changeRole')}
              question={t('admin.user.roleQuestion', { name: detail.name })}
              confirmLabel={t('admin.user.saveRole')}
              onConfirm={async () => {
                await setUserRole(detail.id, role)
                done(t('admin.user.roleChanged'))
              }}
            >
              <div>
                <label htmlFor="user-role" className="text-sm font-medium">
                  {t('admin.user.newRole')}
                </label>
                <select id="user-role" value={role} onChange={(event) => setRole(event.target.value as 'user' | 'admin')} className={controlClass}>
                  <option value="user">{t('admin.roles.user')}</option>
                  <option value="admin">{t('admin.roles.admin')}</option>
                </select>
              </div>
            </ConfirmAction>
          )}
          {ownerActions && (
            <ConfirmAction
              label={t('admin.user.adjustPoints')}
              question={t('admin.user.pointsQuestion', { name: detail.name })}
              confirmLabel={t('admin.user.adjustPoints')}
              onClose={() => {
                setAmount('')
                setPointsReason('')
              }}
              onConfirm={async () => {
                await adjustUserPoints(detail.id, amount, pointsReason)
                done(t('admin.user.pointsAdjusted'))
              }}
            >
              <div>
                <label htmlFor="points-amount" className="text-sm font-medium">
                  {t('admin.user.amount')}
                </label>
                <input id="points-amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className={controlClass} />
              </div>
              <div>
                <label htmlFor="points-reason" className="text-sm font-medium">
                  {t('admin.user.reason')}
                </label>
                <input
                  id="points-reason"
                  type="text"
                  value={pointsReason}
                  onChange={(event) => setPointsReason(event.target.value)}
                  maxLength={255}
                  className={controlClass}
                />
              </div>
            </ConfirmAction>
          )}
          {ownerActions && (
            <ConfirmAction
              label={t('admin.user.resetProgress')}
              question={t('admin.user.resetQuestion', { name: detail.name })}
              confirmLabel={t('admin.user.resetConfirm')}
              danger
              onConfirm={async () => {
                await resetUserProgress(detail.id)
                done(t('admin.user.progressReset'))
              }}
            />
          )}
          {ownerActions && (
            <ConfirmAction
              label={t('admin.user.deleteUser')}
              question={t('admin.user.deleteQuestion', { name: detail.name })}
              confirmLabel={t('admin.user.deleteUser')}
              danger
              onClose={() => setConfirmEmail('')}
              onConfirm={async () => {
                await deleteUser(detail.id, confirmEmail)
                navigate('/admin/users', { replace: true })
              }}
            >
              <div>
                <label htmlFor="delete-email" className="text-sm font-medium">
                  {t('admin.user.typeEmail')} <span className="break-all font-mono">{detail.email}</span> {t('admin.user.toConfirm')}
                </label>
                <input
                  id="delete-email"
                  type="email"
                  autoComplete="off"
                  value={confirmEmail}
                  onChange={(event) => setConfirmEmail(event.target.value)}
                  className={controlClass}
                />
              </div>
            </ConfirmAction>
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="solved-heading">
        <h2 id="solved-heading" className="text-xl font-semibold">
          {t('admin.user.solvedProblems')}
        </h2>
        {detail.solved.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t('admin.user.noneYet')}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded border border-line bg-surface">
            {detail.solved.map((problem) => (
              <li key={`${problem.slug}-${problem.solved_at}`} className="flex flex-wrap justify-between gap-x-4 px-4 py-2">
                <span className="min-w-0 break-words">{problem.title}</span>
                <span className="text-sm text-muted">{formatTime(problem.solved_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="submissions-heading">
        <h2 id="submissions-heading" className="text-xl font-semibold">
          {t('admin.user.recentSubmissions')}
        </h2>
        {detail.submissions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t('admin.user.noneYet')}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded border border-line bg-surface">
            {detail.submissions.map((submission) => (
              <li key={submission.id} className="px-4 py-2">
                <div className="flex flex-wrap justify-between gap-x-4">
                  <span className="min-w-0 break-words">{submission.problem.title}</span>
                  <span className="text-sm text-muted">{formatTime(submission.created_at)}</span>
                </div>
                <p className="text-sm text-muted tabular-nums">
                  {submission.language} · <span className={submission.status === 'passed' ? 'text-pass' : 'text-fail'}>{submission.status}</span> ·{' '}
                  {t('admin.user.tests', { passed: submission.passed_count, total: submission.total_count })}
                  {submission.runtime_ms !== null && t('admin.user.runtime', { ms: submission.runtime_ms })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-xl font-semibold">
          {t('admin.user.recentActivity')}
        </h2>
        {activity === null ? (
          <p className="mt-2 text-sm text-muted">{t('admin.activity.loading')}</p>
        ) : activity.data.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t('admin.user.noActivity')}</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-line rounded border border-line bg-surface">
              {activity.data.map((entry) => (
                <li key={entry.id} className="px-4 py-2">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <span className="font-medium">{t(`admin.events.${entry.event}`, { defaultValue: entry.event })}</span>
                    <span className="text-sm text-muted">{formatTime(entry.created_at)}</span>
                  </div>
                  {(entry.ip || entry.user_agent) && (
                    <p className="break-all text-sm text-muted">
                      {entry.ip ?? t('admin.user.noIp')} · {entry.user_agent ?? t('admin.user.noBrowser')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={activity.current_page} lastPage={activity.last_page} total={activity.total} onPage={setActivityPage} />
          </>
        )}
      </section>
    </div>
  )
}
