import { useEffect, useState } from 'react'
import { ApiError, getLeaderboard, getMyRank, type LeaderboardEntry, type MyRank } from '../api'
import { useAuth } from '../auth'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [error, setError] = useState('')
  const [myRank, setMyRank] = useState<{ userId: number; rank: MyRank } | null>(null)

  useEffect(() => {
    getLeaderboard(50)
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the leaderboard.'))
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-2 text-muted">Points come from solving problems. Each problem counts once.</p>

      {rank && !entries?.some((entry) => entry.is_you) && (
        <p className="mt-4 rounded border border-line bg-surface px-3 py-2">
          Your rank: <span className="font-semibold tabular-nums">{rank.rank}</span>{' '}
          <span className="text-muted tabular-nums">({rank.points} {rank.points === 1 ? 'point' : 'points'})</span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          {error}
        </p>
      )}
      {!error && entries === null && <p className="mt-6 text-muted">Loading leaderboard...</p>}
      {entries !== null && entries.length === 0 && (
        <p className="mt-6 text-muted">Nobody has scored yet. Solve a problem to take first place.</p>
      )}

      {entries !== null && entries.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded border border-line bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="w-20 px-4 py-2 font-medium">
                  Rank
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Points
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
                      {entry.name}
                      {isMe && <span className="ml-2 text-sm text-accent">(you)</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{entry.points}</td>
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
