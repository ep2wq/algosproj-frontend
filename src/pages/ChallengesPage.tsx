import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getChallenges, type ChallengeSummary } from '../api'
import { useAuth } from '../auth'
import Content from '../components/Content'
import DifficultyBadge from '../components/DifficultyBadge'

const DIFFICULTIES = ['easy', 'medium', 'hard']
// Topic filter value for problems that belong to no lesson.
const STANDALONE = '-standalone'

const controlClass = 'mt-1 w-full rounded border border-field bg-surface px-2 py-1.5 text-sm hover:border-muted'

function SolvedMark({ solved }: { solved: boolean }) {
  return solved ? (
    <span className="text-pass">
      <span aria-hidden="true">✓</span>
      <span className="sr-only">Solved</span>
    </span>
  ) : (
    <span className="sr-only">Not solved</span>
  )
}

export default function ChallengesPage() {
  const { user, loading } = useAuth()
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')

  // solved depends on who is asking, so load again when the user logs in or out.
  const userId = user?.id
  useEffect(() => {
    if (loading) return
    let active = true
    getChallenges()
      .then((list) => {
        if (active) setChallenges(list)
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Could not load the challenges.')
      })
    return () => {
      active = false
    }
  }, [loading, userId])

  // Topics in the order the list arrives (module order).
  const topics = new Map<string, string>()
  for (const challenge of challenges ?? []) {
    if (challenge.topic) topics.set(challenge.topic.slug, challenge.topic.title)
  }
  const hasStandalone = challenges?.some((challenge) => challenge.topic === null) ?? false

  const query = search.trim().toLowerCase()
  const statusFilter = user ? status : ''
  const shown = (challenges ?? []).filter(
    (challenge) =>
      (!query || challenge.title.toLowerCase().includes(query)) &&
      (!difficulty || challenge.difficulty === difficulty) &&
      (!topic || (topic === STANDALONE ? challenge.topic === null : challenge.topic?.slug === topic)) &&
      (!statusFilter || (statusFilter === 'solved') === challenge.solved),
  )
  const filtered = Boolean(query || difficulty || topic || statusFilter)

  function clearFilters() {
    setSearch('')
    setDifficulty('')
    setTopic('')
    setStatus('')
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Challenges</h1>
      <p className="mt-2 text-muted">Every problem in one place. Solving one here or in its lesson counts once.</p>

      {error && (
        <p role="alert" className="mt-6 rounded border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          {error}
        </p>
      )}
      {!error && challenges === null && <p className="mt-6 text-muted">Loading challenges...</p>}
      {challenges !== null && challenges.length === 0 && <p className="mt-6 text-muted">No challenges have been published yet.</p>}

      {challenges !== null && challenges.length > 0 && (
        <>
          <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${user ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <div>
              <label htmlFor="challenge-search" className="text-sm font-medium">
                Search by title
              </label>
              <input
                id="challenge-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={controlClass}
              />
            </div>
            <div>
              <label htmlFor="challenge-difficulty" className="text-sm font-medium">
                Difficulty
              </label>
              <select
                id="challenge-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className={controlClass}
              >
                <option value="">All difficulties</option>
                {DIFFICULTIES.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="challenge-topic" className="text-sm font-medium">
                Topic
              </label>
              <select
                id="challenge-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className={controlClass}
              >
                <option value="">All topics</option>
                {[...topics].map(([slug, title]) => (
                  <option key={slug} value={slug} lang="en">
                    {title}
                  </option>
                ))}
                {hasStandalone && <option value={STANDALONE}>No topic</option>}
              </select>
            </div>
            {user && (
              <div>
                <label htmlFor="challenge-status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="challenge-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={controlClass}
                >
                  <option value="">All</option>
                  <option value="solved">Solved</option>
                  <option value="unsolved">Unsolved</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-sm text-muted tabular-nums">
              Showing {shown.length} of {challenges.length}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtered}
              className="rounded border border-line bg-surface px-3 py-1 text-sm hover:border-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear filters
            </button>
          </div>

          {shown.length === 0 ? (
            <p className="mt-4 rounded border border-line bg-surface px-4 py-6 text-center text-muted">
              No challenges match these filters.
            </p>
          ) : (
            <>
              {/* Cards on narrow screens, a table from md up. */}
              <ul className="mt-4 divide-y divide-line rounded border border-line bg-surface md:hidden">
                {shown.map((challenge) => (
                  <li key={challenge.slug} className="px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      {user && <SolvedMark solved={challenge.solved} />}
                      <Link to={`/challenges/${challenge.slug}`} className="rounded font-medium text-accent hover:underline">
                        <Content lang="en">{challenge.title}</Content>
                      </Link>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <DifficultyBadge difficulty={challenge.difficulty} />
                      <span className="tabular-nums">{challenge.points} points</span>
                      {challenge.topic ? <Content lang="en">{challenge.topic.title}</Content> : <span>No topic</span>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 hidden overflow-x-auto rounded border border-line bg-surface md:block">
                <table className="w-full text-start">
                  <thead className="border-b border-line text-sm text-muted">
                    <tr>
                      {user && (
                        <th scope="col" className="w-20 px-4 py-2 font-medium">
                          Status
                        </th>
                      )}
                      <th scope="col" className="px-4 py-2 font-medium">
                        Title
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Topic
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Difficulty
                      </th>
                      <th scope="col" className="px-4 py-2 text-end font-medium">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shown.map((challenge) => (
                      <tr key={challenge.slug}>
                        {user && (
                          <td className="px-4 py-2">
                            <SolvedMark solved={challenge.solved} />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <Link to={`/challenges/${challenge.slug}`} className="rounded text-accent hover:underline">
                            <Content lang="en">{challenge.title}</Content>
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted">
                          {challenge.topic ? <Content lang="en">{challenge.topic.title}</Content> : 'No topic'}
                        </td>
                        <td className="px-4 py-2">
                          <DifficultyBadge difficulty={challenge.difficulty} />
                        </td>
                        <td className="px-4 py-2 text-end tabular-nums">{challenge.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
