import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, getLeaderboard, getMyRank, type LeaderboardEntry, type MyRank } from '../api'
import { useAuth } from '../auth'
import EmptyState from '../components/EmptyState'
import { boardName, boardPoints, boardRank, boardRow } from '../components/leaderboardStyles'
import { LoadingRegion, SkeletonLines } from '../components/Loading'
import { formatNumber } from '../i18n'

// Rows asked for, and rows in the loading skeleton, so a full list doesn't push the footer down.
const LIMIT = 50

export default function LeaderboardPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)
  const [myRank, setMyRank] = useState<{ userId: string; rank: MyRank } | null>(null)

  useEffect(() => {
    getLeaderboard(LIMIT)
      .then(setEntries)
      .catch(setFailure)
  }, [reload])

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

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setFailure(null)
    setReload((count) => count + 1)
  }

  return (
    <div className="max-w-2xl">
      <title>{t('titles.page', { name: t('leaderboard.title') })}</title>
      <h1 className="text-3xl font-semibold tracking-tight">{t('leaderboard.title')}</h1>
      <p className="mt-2 text-muted">{t('leaderboard.intro')}</p>

      {/* Only once the list is in, so it doesn't show and then go when you are in the list. */}
      {rank && entries !== null && !entries.some((entry) => entry.is_you) && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2">
          {t('leaderboard.yourRank')} <span className="font-semibold tabular-nums">{rank.rank}</span>{' '}
          <span className="text-muted tabular-nums">{t('leaderboard.rankPoints', { count: rank.points })}</span>
        </p>
      )}

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded border border-current px-3 py-1 text-sm font-medium hover:bg-fail/10"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      {/* The table with its real header and a row for each one asked for. */}
      {!error && entries === null && (
        <LoadingRegion label={t('leaderboard.loading')} className="mt-6">
          <div className="@container overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-start">
              <thead className="border-b border-line text-sm text-muted">
                <tr className={boardRow}>
                  <th className={`${boardRank} font-medium`}>{t('leaderboard.rank')}</th>
                  <th className={`${boardName} font-medium`}>{t('leaderboard.name')}</th>
                  <th className={`${boardPoints} font-medium`}>{t('leaderboard.points')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Array.from({ length: LIMIT }, (_, row) => (
                  <tr key={row} className={boardRow}>
                    <td className={boardRank}>
                      <SkeletonLines lines={1} className="w-5" />
                    </td>
                    <td className={boardName}>
                      <SkeletonLines lines={1} className={row % 2 ? 'w-28' : 'w-40'} />
                    </td>
                    <td className={boardPoints}>
                      <SkeletonLines lines={1} className="ms-auto w-12" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadingRegion>
      )}
      {entries !== null && entries.length === 0 && (
        <EmptyState>{t('leaderboard.empty')}</EmptyState>
      )}

      {entries !== null && entries.length > 0 && (
        // Clips only the row tints at the rounded corners; the table always fits (leaderboardStyles).
        <div className="@container mt-6 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-start">
            <caption className="sr-only">
              {t('landing.board.caption', { count: entries.length, value: formatNumber(entries.length, language) })}
            </caption>
            <thead className="border-b border-line text-sm text-muted">
              <tr className={boardRow}>
                <th scope="col" className={`${boardRank} font-medium`}>
                  {t('leaderboard.rank')}
                </th>
                <th scope="col" className={`${boardName} font-medium`}>
                  {t('leaderboard.name')}
                </th>
                <th scope="col" className={`${boardPoints} font-medium`}>
                  {t('leaderboard.points')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry, index) => {
                // The server marks the requester's row; ignore it once the user has logged out.
                const isMe = user !== null && entry.is_you
                return (
                  <tr
                    key={index}
                    className={isMe ? `${boardRow} bg-accent-soft` : boardRow}
                    aria-current={isMe ? 'true' : undefined}
                  >
                    <td className={`${boardRank} text-muted`}>{formatNumber(entry.rank, language)}</td>
                    <td className={boardName}>
                      {/* Names can be Arabic or English; dir="auto" lets each show in its own direction. */}
                      <span dir="auto">{entry.name}</span>
                      {isMe && <span className="ms-2 text-sm whitespace-nowrap text-accent">{t('leaderboard.you')}</span>}
                    </td>
                    <td className={boardPoints}>{formatNumber(entry.points, language)}</td>
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
