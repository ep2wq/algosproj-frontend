import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getChallenge, type Challenge } from '../api'
import { useAuth } from '../auth'
import Content from '../components/Content'
import DifficultyBadge from '../components/DifficultyBadge'
import { CheckIcon } from '../components/Icons'
import ProblemSolver from '../components/ProblemSolver'

// Loaded with React.lazy, like the lesson page, so Monaco stays out of the first bundle.
export default function ChallengePage() {
  const { t, i18n } = useTranslation()
  const { slug = '' } = useParams()
  const { user, loading } = useAuth()
  // The loaded result is stored with its slug, so a stale challenge never shows for a new URL.
  const [loaded, setLoaded] = useState<{ slug: string; challenge?: Challenge; failure?: unknown } | null>(null)
  const [reload, setReload] = useState(0)
  // Set after a passing submit, so the page shows solved without loading again.
  const [solvedNow, setSolvedNow] = useState<string | null>(null)

  // solved depends on who is asking, so load again when the user logs in or out; the text depends on
  // the app language. The old challenge stays on screen meanwhile, so the editor keeps its code.
  const userId = user?.id
  const language = i18n.language
  useEffect(() => {
    if (loading) return
    let active = true
    getChallenge(slug)
      .then((challenge) => {
        if (active) setLoaded({ slug, challenge })
      })
      .catch((err) => {
        if (active) setLoaded({ slug, failure: err })
      })
    return () => {
      active = false
    }
  }, [slug, loading, userId, language, reload])

  const current = loaded?.slug === slug ? loaded : null
  const challenge = current?.challenge ?? null
  const failure = current?.failure
  const error =
    failure === undefined
      ? ''
      : failure instanceof ApiError && failure.status === 404
        ? t('challenge.notFound')
        : failure instanceof ApiError
          ? failure.message
          : t('challenge.loadFailed')
  const retryable = !(failure instanceof ApiError && failure.status === 404)

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setLoaded(null)
    setReload((count) => count + 1)
  }

  if (error) {
    return (
      <div className="max-w-prose">
        <div role="alert" className="rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          <p>{error}</p>
          {retryable && (
            <button
              type="button"
              onClick={retry}
              className="mt-2 rounded border border-current px-3 py-1 text-sm font-medium hover:bg-fail/10"
            >
              {t('common.tryAgain')}
            </button>
          )}
        </div>
        <Link to="/challenges" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          {t('challenge.back')}
        </Link>
      </div>
    )
  }

  if (!challenge) return <p className="text-muted">{t('challenge.loading')}</p>

  const solved = user !== null && (challenge.solved || solvedNow === challenge.slug)

  return (
    <div>
      <Link to="/challenges" className="inline-block rounded py-1 text-sm text-muted hover:text-accent">
        {t('challenge.back')}
      </Link>
      <title>{t('titles.page', { name: challenge.title })}</title>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        <Content lang="auto">{challenge.title}</Content>
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {challenge.topic ? <Content lang="auto">{challenge.topic.title}</Content> : <span>{t('common.noTopic')}</span>}
        <DifficultyBadge difficulty={challenge.difficulty} />
        <span className="tabular-nums">{t('common.points', { count: challenge.points })}</span>
        {solved && (
          <span className="inline-flex items-center gap-1 rounded border border-pass/30 bg-pass/10 px-1.5 py-0.5 text-xs font-medium text-pass">
            <CheckIcon className="size-3.5" />
            {t('common.solved')}
          </span>
        )}
        {challenge.lesson_slug && (
          <Link to={`/lessons/${challenge.lesson_slug}`} className="rounded text-accent underline underline-offset-2">
            {t('challenge.openLesson')}
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
