import { useCallback, useEffect, useState } from 'react'
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
import { controlClass, EVENT_LABELS, formatTime, ROLE_LABELS } from './format'
import { alertClass } from './styles'

// /admin/users/:id. Only the actions the current role may use are shown; the backend checks
// every one of them again (403 with a message, shown next to the action).
export default function AdminUserPage() {
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
        setLoadError(err instanceof ApiError && err.status === 404 ? "This user doesn't exist." : err instanceof ApiError ? err.message : 'Could not load the user.'),
      )
  }, [userId])

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
          Back to the users
        </Link>
      </div>
    )
  }

  if (!detail || !me) return <p className="text-muted">Loading user...</p>

  // The same rules as the backend: never yourself, never an owner, and admins only act on users.
  const isSelf = me.id === detail.id
  const canModerate = !isSelf && detail.role !== 'owner' && (me.role === 'owner' || detail.role === 'user')
  const ownerActions = me.role === 'owner' && !isSelf && detail.role !== 'owner'

  return (
    <div className="max-w-4xl">
      <Link to="/admin/users" className="rounded text-sm text-muted hover:text-accent">
        Users
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight" dir="auto">
          {detail.name}
        </h1>
        {detail.banned_at && <BannedBadge />}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 rounded border border-line bg-surface p-4 sm:grid-cols-[auto_1fr]">
        <dt className="text-sm text-muted">Email</dt>
        <dd className="break-all">{detail.email}</dd>
        <dt className="text-sm text-muted">Role</dt>
        <dd>{ROLE_LABELS[detail.role]}</dd>
        <dt className="text-sm text-muted">Points</dt>
        <dd className="tabular-nums">{detail.points}</dd>
        <dt className="text-sm text-muted">Solved</dt>
        <dd className="tabular-nums">{detail.solved_count}</dd>
        <dt className="text-sm text-muted">Joined</dt>
        <dd>{formatTime(detail.created_at)}</dd>
        {detail.banned_at && (
          <>
            <dt className="text-sm text-muted">Banned</dt>
            <dd className="break-words">
              {formatTime(detail.banned_at)}. Reason: {detail.ban_reason}
            </dd>
          </>
        )}
      </dl>

      <section className="mt-8" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-xl font-semibold">
          Actions
        </h2>
        {notice && (
          <p role="status" className="mt-2 text-pass">
            {notice}
          </p>
        )}
        {!canModerate && !ownerActions && (
          <p className="mt-2 text-sm text-muted">
            {isSelf
              ? "You can't act on your own account here."
              : detail.role === 'owner'
                ? 'Owners can only be changed with the artisan command.'
                : 'Only an owner can act on an admin.'}
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {canModerate &&
            (detail.banned_at ? (
              <ConfirmAction
                label="Unban"
                question={`Unban ${detail.name}? Their points and progress are kept.`}
                confirmLabel="Yes, unban"
                onConfirm={async () => {
                  await unbanUser(detail.id)
                  done('Unbanned.')
                }}
              />
            ) : (
              <ConfirmAction
                label="Ban"
                question={`Ban ${detail.name}? They are logged out everywhere and can't log in.`}
                confirmLabel="Yes, ban"
                danger
                onClose={() => setBanReason('')}
                onConfirm={async () => {
                  await banUser(detail.id, banReason)
                  done('Banned.')
                }}
              >
                <div>
                  <label htmlFor="ban-reason" className="text-sm font-medium">
                    Reason (shown to the user, at most 255 characters)
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
              label="Log out everywhere"
              question={`End every session of ${detail.name}?`}
              confirmLabel="Yes, log out everywhere"
              onConfirm={async () => {
                await logoutUserEverywhere(detail.id)
                done('Logged out everywhere.')
              }}
            />
          )}
          {ownerActions && (
            <ConfirmAction
              label="Change role"
              question={`Change the role of ${detail.name}?`}
              confirmLabel="Save role"
              onConfirm={async () => {
                await setUserRole(detail.id, role)
                done('Role changed.')
              }}
            >
              <div>
                <label htmlFor="user-role" className="text-sm font-medium">
                  New role
                </label>
                <select id="user-role" value={role} onChange={(event) => setRole(event.target.value as 'user' | 'admin')} className={controlClass}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </ConfirmAction>
          )}
          {ownerActions && (
            <ConfirmAction
              label="Adjust points"
              question={`Add or remove points for ${detail.name}? Points can't go below 0.`}
              confirmLabel="Adjust points"
              onClose={() => {
                setAmount('')
                setPointsReason('')
              }}
              onConfirm={async () => {
                await adjustUserPoints(detail.id, amount, pointsReason)
                done('Points adjusted.')
              }}
            >
              <div>
                <label htmlFor="points-amount" className="text-sm font-medium">
                  Amount (negative to remove)
                </label>
                <input id="points-amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className={controlClass} />
              </div>
              <div>
                <label htmlFor="points-reason" className="text-sm font-medium">
                  Reason
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
              label="Reset progress"
              question={`Delete every solved problem of ${detail.name} and set their points to 0? Submissions are kept.`}
              confirmLabel="Yes, reset"
              danger
              onConfirm={async () => {
                await resetUserProgress(detail.id)
                done('Progress reset.')
              }}
            />
          )}
          {ownerActions && (
            <ConfirmAction
              label="Delete user"
              question={`Delete ${detail.name} for good? Their submissions and solved problems are deleted too.`}
              confirmLabel="Delete user"
              danger
              onClose={() => setConfirmEmail('')}
              onConfirm={async () => {
                await deleteUser(detail.id, confirmEmail)
                navigate('/admin/users', { replace: true })
              }}
            >
              <div>
                <label htmlFor="delete-email" className="text-sm font-medium">
                  Type the email <span className="break-all font-mono">{detail.email}</span> to confirm
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
          Solved problems
        </h2>
        {detail.solved.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet.</p>
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
          Recent submissions
        </h2>
        {detail.submissions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet.</p>
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
                  {submission.passed_count}/{submission.total_count} tests
                  {submission.runtime_ms !== null && ` · ${submission.runtime_ms} ms`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-xl font-semibold">
          Recent activity
        </h2>
        {activity === null ? (
          <p className="mt-2 text-sm text-muted">Loading activity...</p>
        ) : activity.data.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No activity recorded.</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-line rounded border border-line bg-surface">
              {activity.data.map((entry) => (
                <li key={entry.id} className="px-4 py-2">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <span className="font-medium">{EVENT_LABELS[entry.event] ?? entry.event}</span>
                    <span className="text-sm text-muted">{formatTime(entry.created_at)}</span>
                  </div>
                  {(entry.ip || entry.user_agent) && (
                    <p className="break-all text-sm text-muted">
                      {entry.ip ?? 'No IP'} · {entry.user_agent ?? 'No browser'}
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
