import { Suspense, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ApiError, getLesson, getModules, type Lesson, type Module } from '../api'
import ReportProblemButton from '../components/ReportProblemButton'
import { skipLink } from '../components/buttonStyles'
import Content from '../components/Content'
import DifficultyBadge from '../components/DifficultyBadge'
import { CellLoader, LoadingRegion, SkeletonLines } from '../components/Loading'
import LessonBody, { TextWithCode } from '../components/LessonBody'
import ProblemCard from '../components/ProblemCard'
import ScrollProgress from '../components/ScrollProgress'
import { formatNumber } from '../i18n'
import { lessonSections } from '../lessonText'
import { VISUALS } from '../visuals'

const DIFFICULTIES = ['easy', 'medium', 'hard']

// The drawing's frame while a visualization loads: the height of the shortest visualization at that
// width (500 px on a phone, 406 px from lg), so the frame never shrinks when the drawing arrives.
const VISUAL_FRAME = 'h-[31rem] rounded-lg border border-line bg-surface lg:h-[25rem]'

// Loaded with React.lazy, so Monaco stays out of the first bundle.
export default function LessonPage() {
  const { t, i18n } = useTranslation()
  const { slug = '' } = useParams()
  // Layout's place for a second skip link, right after "Skip to content".
  const skipSlot = useOutletContext<HTMLDivElement | null>()
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

  // The course's modules (the same list the lessons page loads): the breadcrumb's module and the
  // previous and next lessons. Nothing waits for it; a failure only leaves those out.
  const [modules, setModules] = useState<Module[] | null>(null)
  useEffect(() => {
    let active = true
    getModules()
      .then((list) => {
        if (active) setModules(list)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [language])

  // The rail's "On this page" marks the section being read: the first of the lesson's headings, the
  // visualization's and the problems' that is in a band near the top of the screen; none in it keeps
  // the last one. One IntersectionObserver, set up after render (no layout reads while rendering).
  const sections = useMemo(() => (lesson?.body ? lessonSections(lesson.body) : []), [lesson])
  const targets = [...sections.map((section) => section.id), ...(Visual ? ['visual-heading'] : []), ...(lesson?.problems.map((problem) => `problem-${problem.id}`) ?? [])].join(' ')
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const ids = targets ? targets.split(' ') : []
    const elements = ids.map((id) => document.getElementById(id)).filter((element) => element !== null)
    if (elements.length === 0) return
    const inBand = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id)
          else inBand.delete(entry.target.id)
        }
        const first = ids.find((id) => inBand.has(id))
        if (first) setActive(first)
      },
      { rootMargin: '-90px 0px -60% 0px' },
    )
    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [targets])

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
          <ReportProblemButton error={failure} />
        </div>
        <Link to="/lessons" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          {t('lesson.backToLessons')}
        </Link>
      </div>
    )
  }

  // Lessons › the module (a link to its first lesson). Lessons alone until the module list arrives.
  const breadcrumbLink = 'inline-flex min-h-11 items-center rounded hover:text-accent sm:pointer-fine:min-h-8'
  const breadcrumb = (module: Module | null) => (
    <nav aria-label={t('lesson.breadcrumb')} className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5 text-muted">
        <li>
          <Link to="/lessons" className={breadcrumbLink}>
            {t('nav.lessons')}
          </Link>
        </li>
        {module && module.lessons[0] && (
          <li className="flex min-w-0 items-center gap-x-1.5">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 rtl:-scale-x-100" />
            <Link to={`/lessons/${module.lessons[0].slug}`} className={breadcrumbLink}>
              <Content lang="auto">{module.title}</Content>
            </Link>
          </li>
        )}
      </ol>
    </nav>
  )

  // The text column: centred at the reading width below xl; from xl the second of four columns,
  // with the rail beside it and the outer two taking what is left, so the visualization and the
  // problems (col-span-full) use the whole container. The column's own font size sets the ch.
  const grid = 'xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,68ch)_17rem_minmax(0,1fr)] text-lesson-body'
  const textColumn = 'mx-auto max-w-lesson xl:col-start-2 xl:row-start-1 xl:mx-0 xl:max-w-none'

  // The title, the first paragraphs and headings of a lesson, and the drawing's frame when this lesson
  // has a visualization (known from the address).
  if (!lesson) {
    return (
      <div className={grid}>
        <div className={textColumn}>
          {breadcrumb(null)}
          {/* The page keeps a main heading while the title loads. */}
          <h1 className="sr-only">{t('lesson.loading')}</h1>
          <LoadingRegion label={t('lesson.loading')}>
            <SkeletonLines lines={1} className="text-lesson-title mt-2 w-1/2 max-w-sm" />
            <div className="mt-6">
              <SkeletonLines lines={3} />
              <SkeletonLines lines={3} className="mt-4" />
              <SkeletonLines lines={1} className="text-lesson-heading mt-8 w-40" />
              <SkeletonLines lines={4} className="mt-3" />
              <SkeletonLines lines={1} className="text-lesson-heading mt-8 w-48" />
              <SkeletonLines lines={3} className="mt-3" />
            </div>
          </LoadingRegion>
        </div>
        {Visual && (
          <div className="mt-10 border-t border-line pt-8 xl:col-span-full">
            <p className="text-lesson-heading">{t('lesson.visualization')}</p>
            <div className={`mt-4 ${VISUAL_FRAME}`} />
          </div>
        )}
      </div>
    )
  }

  // From the module list: where this lesson sits, for the breadcrumb and the previous and next cards.
  const course = modules?.flatMap((module) => module.lessons.map((item) => ({ module, lesson: item }))) ?? []
  const place = course.findIndex((entry) => entry.lesson.slug === slug)
  const module = place === -1 ? null : course[place].module
  const previous = place > 0 ? course[place - 1].lesson : null
  const following = place !== -1 && place < course.length - 1 ? course[place + 1].lesson : null

  // The hardest difficulty among the lesson's problems, and their points together.
  const difficulty = lesson.problems.reduce<string | null>(
    (hardest, problem) => (hardest === null || DIFFICULTIES.indexOf(problem.difficulty) > DIFFICULTIES.indexOf(hardest) ? problem.difficulty : hardest),
    null,
  )
  const points = lesson.problems.reduce((sum, problem) => sum + problem.points, 0)
  const chip = 'inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-muted'

  // "On this page": the lesson's own headings, then the visualization and each problem.
  const contents = [
    ...sections.map((section) => ({ id: section.id, label: <Content lang={lesson.body_lang}><TextWithCode text={section.text} /></Content> })),
    ...(Visual ? [{ id: 'visual-heading', label: <>{t('lesson.visualization')}</> }] : []),
    ...lesson.problems.map((problem) => ({ id: `problem-${problem.id}`, label: <Content lang="auto">{problem.title}</Content> })),
  ]

  return (
    <div className={grid}>
      <ScrollProgress />
      {/* Moves focus to the first problem (like Skip to content, without changing the address). */}
      {skipSlot &&
        lesson.problems.length > 0 &&
        createPortal(
          <a
            href="#challenge"
            onClick={(event) => {
              event.preventDefault()
              const target = document.getElementById('challenge')
              target?.focus({ preventScroll: true })
              target?.scrollIntoView({ block: 'start' })
            }}
            className={skipLink}
          >
            {t('nav.skipToChallenge')}
          </a>,
          skipSlot,
        )}
      <title>{t('titles.page', { name: lesson.title })}</title>

      <div className={textColumn}>
        {breadcrumb(module)}
        <h1 className="text-lesson-title mt-2">
          <Content lang="auto">{lesson.title}</Content>
        </h1>
        {(difficulty || lesson.problems.length > 0 || Visual) && (
          <p className="mt-4 flex flex-wrap items-center gap-2">
            {difficulty && <DifficultyBadge difficulty={difficulty} />}
            {lesson.problems.length > 0 && (
              <span className={chip}>
                {t('lesson.problemCount', { count: lesson.problems.length, value: formatNumber(lesson.problems.length, language) })}
                {points > 0 && ` · ${t('common.points', { count: points, value: formatNumber(points, language) })}`}
              </span>
            )}
            {Visual && <span className={chip}>{t('lesson.visualization')}</span>}
          </p>
        )}
        {lesson.body && (
          <div className="mt-8">
            <LessonBody text={lesson.body} lang={lesson.body_lang} lesson />
          </div>
        )}
      </div>

      {/* The rail, from xl: sticky below the header (and the verify-email notice), scrolling on its own
          when taller than the screen. In Arabic it sits on the left (logical columns). */}
      <aside aria-label={t('lesson.rail')} className="max-xl:hidden xl:col-start-3 xl:row-start-1 xl:ps-10">
        <div className="sticky top-[calc(5.5rem+var(--notice-h,0px))] max-h-[calc(100vh-7rem-var(--notice-h,0px))] overflow-y-auto pb-4 text-sm">
          {contents.length > 0 && (
            <nav aria-labelledby="lesson-contents">
              <p id="lesson-contents" className="font-semibold">
                {t('lesson.onThisPage')}
              </p>
              <ul className="mt-2 border-s border-line">
                {contents.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      aria-current={active === entry.id ? 'location' : undefined}
                      className={`-ms-px flex min-h-11 items-center border-s-2 py-1 ps-3 pointer-fine:min-h-8 ${active === entry.id ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {(previous || following) && (
            <div className="mt-8 space-y-2">
              {following && (
                <Link to={`/lessons/${following.slug}`} className="block rounded-lg border border-line bg-surface px-3 py-2.5 hover:bg-hover">
                  <span className="block text-xs text-muted">{t('lesson.nextLesson')}</span>
                  <span className="block font-medium text-ink">
                    <Content lang="auto">{following.title}</Content>
                  </span>
                </Link>
              )}
              {previous && (
                <Link to={`/lessons/${previous.slug}`} className="block rounded-lg border border-line bg-surface px-3 py-2.5 hover:bg-hover">
                  <span className="block text-xs text-muted">{t('lesson.previousLesson')}</span>
                  <span className="block font-medium text-ink">
                    <Content lang="auto">{previous.title}</Content>
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {Visual && (
        <section className="mt-12 border-t border-line pt-8 xl:col-span-full" aria-labelledby="visual-heading">
          <h2 id="visual-heading" className="text-lesson-heading">
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

      {lesson.problems.map((problem, index) => (
        <div key={problem.id} className="xl:col-span-full">
          <ProblemCard problem={problem} id={index === 0 ? 'challenge' : undefined} />
        </div>
      ))}
    </div>
  )
}
