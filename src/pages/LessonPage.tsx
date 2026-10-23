import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getLesson, type Lesson } from '../api'
import Content from '../components/Content'
import { CellLoader, LoadingRegion, SkeletonLines } from '../components/Loading'
import LessonBody from '../components/LessonBody'
import ProblemCard from '../components/ProblemCard'
import ScrollProgress from '../components/ScrollProgress'
import { VISUALS } from '../visuals'

// The drawing's frame while a visualization loads: the height of the shortest visualization at that
// width (500 px on a phone, 406 px from lg), so the frame never shrinks when the drawing arrives.
const VISUAL_FRAME = 'h-[31rem] rounded-lg border border-line bg-surface lg:h-[25rem]'

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
        <Link to="/lessons" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          {t('lesson.backToLessons')}
        </Link>
      </div>
    )
  }

  const backLink = (
    <Link to="/lessons" className="inline-block rounded py-1 text-sm text-muted hover:text-accent">
      {t('lesson.allLessons')}
    </Link>
  )

  // The title, the first paragraphs and headings of a lesson, and the drawing's frame when this lesson
  // has a visualization (known from the address).
  if (!lesson) {
    return (
      <div>
        {backLink}
        {/* The page keeps a main heading while the title loads. */}
        <h1 className="sr-only">{t('lesson.loading')}</h1>
        <LoadingRegion label={t('lesson.loading')}>
          <SkeletonLines lines={1} className="mt-2 w-1/2 max-w-sm text-3xl" />
          <div className="mt-4 max-w-prose leading-relaxed">
            <SkeletonLines lines={3} />
            <SkeletonLines lines={3} className="mt-4" />
            <SkeletonLines lines={1} className="mt-10 w-40 text-xl" />
            <SkeletonLines lines={4} className="mt-4" />
            <SkeletonLines lines={1} className="mt-10 w-48 text-xl" />
            <SkeletonLines lines={3} className="mt-4" />
          </div>
          {Visual && (
            <div className="mt-10 border-t border-line pt-8">
              <p className="text-xl font-semibold">{t('lesson.visualization')}</p>
              <div className={`mt-4 ${VISUAL_FRAME}`} />
            </div>
          )}
        </LoadingRegion>
      </div>
    )
  }

  return (
    <div>
      {backLink}
      <ScrollProgress />
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
          <Suspense fallback={<CellLoader label={t('lesson.loadingVisualization')} className={`mt-4 ${VISUAL_FRAME}`} />}>
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
