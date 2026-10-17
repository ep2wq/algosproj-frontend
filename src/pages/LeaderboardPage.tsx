import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, getLeaderboard, getMyRank, type LeaderboardEntry, type MyRank } from '../api'
import { useAuth } from '../auth'

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [myRank, setMyRank] = useState<{ userId: number; rank: MyRank } | null>(null)

  useEffect(() => {
    getLeaderboard(50)
      .then(setEntries)
      .catch(setFailure)
  }, [])

  const userId = user?.id
  const userPoints = user?.points
  useEffect(() => {
    if (userId === undefined) return
    let active = true
    getMyRank()
      .then((rank) => {
        if (active) setMyRank({ userId, rank })
      })
      .catch(() => {
        // Not critical; the table still shows.
      })
    return () => {
      active = false
    }
  }, [userId, userPoints])

  const rank = user && myRank?.userId === user.id ? myRank.rank : null
  const error = failure === null ? '' : failure instanceof ApiError ? failure.message : t('leaderboard.loadFailed')

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('leaderboard.title')}</h1>
      <p className="mt-2 text-muted">{t('leaderboard.intro')}</p>

      {rank && !entries?.some((entry) => entry.is_you) && (
        <p className="mt-4 rounded border border-line bg-surface px-3 py-2">
          {t('leaderboard.yourRank')} <span className="font-semibold tabular-nums">{rank.rank}</span>{' '}
          <span className="text-muted tabular-nums">{t('leaderboard.rankPoints', { count: rank.points })}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          {error}
        </p>
      )}
      {!error && entries === null && <p className="mt-6 text-muted">{t('leaderboard.loading')}</p>}
      {entries !== null && entries.length === 0 && (
        <p className="mt-6 text-muted">{t('leaderboard.empty')}</p>
      )}

      {entries !== null && entries.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded border border-line bg-surface">
          <table className="w-full text-start">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="w-20 px-4 py-2 font-medium">
                  {t('leaderboard.rank')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('leaderboard.name')}
                </th>
                <th scope="col" className="px-4 py-2 text-end font-medium">
                  {t('leaderboard.points')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry, index) => {
                // The server marks the requester's row; ignore it once the user has logged out.
                const isMe = user !== null && entry.is_you
                return (
                  <tr key={index} className={isMe ? 'bg-accent-soft' : undefined} aria-current={isMe ? 'true' : undefined}>
                    <td className="px-4 py-2 tabular-nums text-muted">{entry.rank}</td>
                    <td className="px-4 py-2">
                      {/* Names can be Arabic or English; dir="auto" lets each show in its own direction. */}
                      <span dir="auto">{entry.name}</span>
                      {isMe && <span className="ms-2 text-sm text-accent">{t('leaderboard.you')}</span>}
                    </td>
                    <td className="px-4 py-2 text-end tabular-nums">{entry.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
