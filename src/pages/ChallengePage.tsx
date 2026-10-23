import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getChallenge, type Challenge } from '../api'
import { useAuth } from '../auth'
import Content from '../components/Content'
import DifficultyBadge from '../components/DifficultyBadge'
import { CheckIcon } from '../components/Icons'
import { TextWithCode } from '../components/LessonBody'
import { LoadingRegion, SkeletonLines } from '../components/Loading'
import { Skeleton } from '../components/ui/skeleton'
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

  const backLink = (
    <Link to="/challenges" className="inline-block rounded py-1 text-sm text-muted hover:text-accent">
      {t('challenge.back')}
    </Link>
  )

  // The layout of ProblemSolver: title and details, the statement, two examples, the framed editor at
  // its real height and the button.
  if (!challenge) {
    return (
      <div>
        {backLink}
        {/* The page keeps a main heading while the title loads. */}
        <h1 className="sr-only">{t('challenge.loading')}</h1>
        <LoadingRegion label={t('challenge.loading')}>
          <SkeletonLines lines={1} className="mt-2 w-1/2 max-w-sm text-3xl" />
          <SkeletonLines lines={1} className="mt-2 w-56 text-sm" />
          {/* The statement: a description, then Input, Output and Constraints, each after a blank line. */}
          <div className="mt-3 max-w-prose">
            <SkeletonLines lines={3} />
            {['w-12', 'w-16', 'w-24'].map((width) => (
              <Fragment key={width}>
                <div className="h-lh" />
                <SkeletonLines lines={1} className={`${width} text-sm`} />
                <SkeletonLines lines={1} className="w-1/2" />
              </Fragment>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-sm font-semibold">{t('solver.examples')}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div key={index} className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-3">
                  {[0, 1].map((cell) => (
                    <div key={cell}>
                      <SkeletonLines lines={1} className="w-16 text-xs" />
                      <Skeleton className="mt-1 h-7 w-12" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-3 py-2">
              <div className="flex items-center">
                <span className="text-sm font-medium">{t('solver.language')}</span>
                <div className="ms-2 h-[1.875rem] w-24 rounded border border-line bg-surface" />
              </div>
              <p className="text-xs text-muted">
                <TextWithCode text={t('solver.tabHint')} />
              </p>
            </div>
            <div className="h-[280px]" />
          </div>
          <Skeleton className="mt-4 h-[2.625rem] w-36" />
        </LoadingRegion>
      </div>
    )
  }

  const solved = user !== null && (challenge.solved || solvedNow === challenge.slug)

  return (
    <div>
      {backLink}
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
