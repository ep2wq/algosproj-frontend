import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getChallenge, type Challenge } from '../api'
import { useAuth } from '../auth'
import DifficultyBadge from '../components/DifficultyBadge'
import ProblemSolver from '../components/ProblemSolver'

// Loaded with React.lazy, like the lesson page, so Monaco stays out of the first bundle.
export default function ChallengePage() {
  const { slug = '' } = useParams()
  const { user, loading } = useAuth()
  // The loaded result is stored with its slug, so a stale challenge never shows for a new URL.
  const [loaded, setLoaded] = useState<{ slug: string; challenge?: Challenge; error?: string } | null>(null)
  // Set after a passing submit, so the page shows solved without loading again.
  const [solvedNow, setSolvedNow] = useState<string | null>(null)

  // solved depends on who is asking, so load again when the user logs in or out.
  const userId = user?.id
  useEffect(() => {
    if (loading) return
    let active = true
    getChallenge(slug)
      .then((challenge) => {
        if (active) setLoaded({ slug, challenge })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) {
          setLoaded({ slug, error: "This challenge doesn't exist." })
        } else {
          setLoaded({ slug, error: err instanceof ApiError ? err.message : 'Could not load the challenge.' })
        }
      })
    return () => {
      active = false
    }
  }, [slug, loading, userId])

  const current = loaded?.slug === slug ? loaded : null
  const challenge = current?.challenge ?? null
  const error = current?.error ?? ''

  if (error) {
    return (
      <div className="max-w-prose">
        <p role="alert" className="rounded border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          {error}
        </p>
        <Link to="/challenges" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          Back to challenges
        </Link>
      </div>
    )
  }

  if (!challenge) return <p className="text-muted">Loading challenge...</p>

  const solved = user !== null && (challenge.solved || solvedNow === challenge.slug)

  return (
    <div>
      <Link to="/challenges" className="rounded text-sm text-muted hover:text-accent">
        Back to challenges
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{challenge.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>{challenge.topic ? challenge.topic.title : 'No topic'}</span>
        <DifficultyBadge difficulty={challenge.difficulty} />
        <span className="tabular-nums">{challenge.points} points</span>
        {solved && (
          <span className="rounded border border-pass/30 bg-pass/10 px-1.5 py-0.5 text-xs font-medium text-pass">
            <span aria-hidden="true">✓ </span>Solved
          </span>
        )}
        {challenge.lesson_slug && (
          <Link to={`/lessons/${challenge.lesson_slug}`} className="rounded text-accent underline underline-offset-2">
            Open the lesson
          </Link>
        )}
      </div>
      <ProblemSolver
        key={challenge.id}
        problem={challenge}
        examplesHeading="h2"
        onPassed={() => setSolvedNow(challenge.slug)}
      />
    </div>
  )
}
