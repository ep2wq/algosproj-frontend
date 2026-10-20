import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getLesson, type Lesson } from '../api'
import Content from '../components/Content'
import LessonBody from '../components/LessonBody'
import ProblemCard from '../components/ProblemCard'
import { VISUALS } from '../visuals'

// Loaded with React.lazy, so Monaco stays out of the first bundle.
export default function LessonPage() {
  const { t, i18n } = useTranslation()
  const { slug = '' } = useParams()
  // The loaded result is stored with its slug, so a stale lesson never shows for a new URL.
  const [loaded, setLoaded] = useState<{ slug: string; lesson?: Lesson; failure?: unknown } | null>(null)
  const [reload, setReload] = useState(0)

  // The text comes in the app language, so load again when it changes. The old lesson stays on
  // screen until the new one arrives, so the editors stay mounted and keep their code.
  const language = i18n.language
  useEffect(() => {
    let active = true
    getLesson(slug)
      .then((lesson) => {
        if (active) setLoaded({ slug, lesson })
      })
      .catch((err) => {
        if (active) setLoaded({ slug, failure: err })
      })
    return () => {
      active = false
    }
  }, [slug, language, reload])

  const current = loaded?.slug === slug ? loaded : null
  const lesson = current?.lesson ?? null
  const failure = current?.failure
  const error =
    failure === undefined
      ? ''
      : failure instanceof ApiError && failure.status === 404
        ? t('lesson.notFound')
        : failure instanceof ApiError
          ? failure.message
          : t('lesson.loadFailed')
  const retryable = !(failure instanceof ApiError && failure.status === 404)

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setLoaded(null)
    setReload((count) => count + 1)
  }

  const Visual = VISUALS.get(slug)

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
        <Link to="/" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          {t('lesson.backToLessons')}
        </Link>
      </div>
    )
  }

  if (!lesson) return <p className="text-muted motion-safe:animate-appear motion-safe:[animation-delay:300ms]">{t('lesson.loading')}</p>

  return (
    <div>
      <Link to="/" className="inline-block rounded py-1 text-sm text-muted hover:text-accent">
        {t('lesson.allLessons')}
      </Link>
      <title>{t('titles.page', { name: lesson.title })}</title>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        <Content lang="auto">{lesson.title}</Content>
      </h1>
      {lesson.body && <LessonBody text={lesson.body} lang={lesson.body_lang} />}

      {Visual && (
        <section className="mt-10 border-t border-line pt-8" aria-labelledby="visual-heading">
          <h2 id="visual-heading" className="text-xl font-semibold">
            {t('lesson.visualization')}
          </h2>
          <Suspense fallback={<p className="mt-4 text-sm text-muted motion-safe:animate-appear motion-safe:[animation-delay:300ms]">{t('lesson.loadingVisualization')}</p>}>
            {/* Text and controls follow the interface language; the drawings stay left to right. */}
            {/* Looked up from a module-level map, so it is the same component on every render. */}
            {/* oxlint-disable-next-line react/static-components */}
            <Visual />
          </Suspense>
        </section>
      )}

      {lesson.problems.map((problem) => (
        <ProblemCard key={problem.id} problem={problem} />
      ))}
    </div>
  )
}
