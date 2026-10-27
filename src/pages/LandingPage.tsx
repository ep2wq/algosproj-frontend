import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { getChallenges, getModules, LANGUAGES, type ChallengeSummary, type Module } from '../api'
import { useAuth } from '../auth'
import { primaryButton, secondaryButton } from '../components/buttonStyles'
import { ChallengesPanel, LeaderboardPanel, LessonsPanel } from '../components/LandingPanels'
import { TextWithCode } from '../components/LessonBody'
import { CellLoader } from '../components/Loading'
import PageMeta from '../components/PageMeta'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { formatNumber } from '../i18n'
import { lessonsDone, nextLesson } from '../progress'
import { LANGUAGE_LABELS } from '../starters'
import { VISUALS } from '../visuals'
import { useScrollCue } from '../visuals/useScrollCue'

// Lazy, like every visualization: the first screen does not wait for the visuals strings. The
// fallbacks keep the same height, so nothing below moves when they arrive.
const HeroSearch = lazy(() => import('../visuals/AutoSearchVisual').then((m) => ({ default: m.HeroSearch })))
const BilingualCaption = lazy(() => import('../visuals/AutoSearchVisual').then((m) => ({ default: m.BilingualCaption })))

const TAB_IDS = ['lessons', 'challenges', 'leaderboard']

// One array cell from the visualizations (value box, index under it): the step markers.
function CellMarker({ index }: { index: number }) {
  return (
    <span aria-hidden="true" dir="ltr" className="flex w-10 shrink-0 flex-col items-center">
      <span className="flex size-10 items-center justify-center rounded border-2 border-accent bg-accent-soft font-semibold text-accent tabular-nums">
        {index}
      </span>
    </span>
  )
}

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const [modules, setModules] = useState<Module[] | null>(null)
  // Who the list was loaded for: solved belongs to that user only.
  const [loaded, setLoaded] = useState<{ userId: string | null; list: ChallengeSummary[] } | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)

  const requested = params.get('tab') ?? ''
  const urlTab = TAB_IDS.includes(requested) ? requested : 'lessons'
  // The tab row answers at once and the URL follows (the router applies it a moment later, and Base
  // UI would read a stale value on a quick second arrow key). A ?tab= change from outside, such as a
  // link to /, still wins.
  const [tab, setTab] = useState(urlTab)
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab)
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab)
    setTab(urlTab)
  }
  const language = i18n.language
  // A panel is rendered the first time its tab opens and then stays mounted (hidden), so its data
  // loads once.
  const [opened, setOpened] = useState([tab])
  // If the tab labels do not fit (large text), the row scrolls and its end edge fades.
  const [tabRow, moreTabs] = useScrollCue<HTMLDivElement>()
  if (!opened.includes(tab)) setOpened([...opened, tab])

  // Titles come in the app language: load again when it changes.
  useEffect(() => {
    let active = true
    getModules()
      .then((list) => {
        if (active) setModules(list)
      })
      .catch((err) => {
        if (active) setFailure(err)
      })
    return () => {
      active = false
    }
  }, [language, reload])

  // solved depends on who is asking: load again on log in or out (after /me has answered).
  const userId = user?.id
  useEffect(() => {
    if (loading) return
    let active = true
    getChallenges()
      .then((list) => {
        if (active) setLoaded({ userId: userId ?? null, list })
      })
      .catch((err) => {
        if (active) setFailure(err)
      })
    return () => {
      active = false
    }
  }, [loading, userId, language, reload])

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setFailure(null)
    setReload((count) => count + 1)
  }

  // A deep link (?tab=) without a history entry per tab.
  function selectTab(id: string) {
    setTab(id)
    setParams(id === 'lessons' ? {} : { tab: id }, { replace: true, preventScrollReset: true })
  }

  // Until the list for the current user arrives (just after logging in or out), show none of it.
  const challenges = loaded && loaded.userId === (user?.id ?? null) ? loaded.list : null
  const done = user && challenges ? lessonsDone(challenges) : null
  const next = modules ? nextLesson(modules, done ?? new Set()) : null
  const lessonCount = modules?.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0
  const firstLesson = modules?.find((module) => module.lessons.length > 0)?.lessons[0]

  const data = { modules, challenges, failure, retry }
  const heroPlaceholder = <CellLoader className="h-[22.5rem] rounded-lg border border-line bg-surface" />
  const captionPlaceholder = <div aria-hidden="true" className="h-24" />

  return (
    <div>
      <PageMeta title={t('landing.metaTitle')} description={t('landing.metaDescription')} path="/" />

      <section aria-labelledby="landing-title" className="grid grid-cols-1 items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        <div className="lg:pt-6">
          <h1 id="landing-title" className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('landing.title')}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink">
            <TextWithCode text={t('landing.intro')} />
          </p>
          {/* Hidden, not removed, while /me answers: no logged-out/logged-in swap and no jump. */}
          <div className={`mt-8 flex flex-wrap gap-3 ${loading ? 'invisible' : ''}`}>
            {user ? (
              <>
                <Link to={next ? `/lessons/${next.lesson.slug}` : '/lessons'} className={primaryButton}>
                  {t('landing.continue')}
                </Link>
                <Link to="/lessons" className={secondaryButton}>
                  {t('landing.allLessons')}
                </Link>
              </>
            ) : (
              <>
                <Link to={firstLesson ? `/lessons/${firstLesson.slug}` : '/lessons'} className={primaryButton}>
                  {t('landing.startFirst')}
                </Link>
                <Link to="/register" className={secondaryButton}>
                  {t('landing.createAccount')}
                </Link>
              </>
            )}
          </div>
          {/* Real counts from the API; the line keeps its height until they arrive (two lines on a
              phone, where it wraps). */}
          <p className="mt-6 min-h-[2lh] text-sm text-muted sm:min-h-[1lh]">
            {modules && challenges
              ? t('landing.counts', {
                  modules: t('landing.moduleCount', { count: modules.length, value: formatNumber(modules.length, language) }),
                  lessons: t('landing.lessonCount', { count: lessonCount, value: formatNumber(lessonCount, language) }),
                  visuals: t('landing.visualCount', { count: VISUALS.size, value: formatNumber(VISUALS.size, language) }),
                  problems: t('landing.problemCount', { count: challenges.length, value: formatNumber(challenges.length, language) }),
                })
              : ' '}
          </p>
        </div>
        {/* The static HTML (src/prerender.ts) gets the placeholder itself: renderToString can't wait
            for lazy code and would mark the boundary with an error. */}
        {import.meta.env.SSR ? (
          heroPlaceholder
        ) : (
          <Suspense fallback={heroPlaceholder}>
            <HeroSearch />
          </Suspense>
        )}
      </section>

      <section aria-labelledby="landing-inside" className="mt-20">
        <h2 id="landing-inside" className="text-2xl font-semibold tracking-tight">
          {t('landing.insideTitle')}
        </h2>
        <p className="mt-2 max-w-prose text-muted">{t('landing.insideIntro')}</p>
        {/* WAI-ARIA tabs with automatic activation (activateOnFocus): arrows in reading order, Home
            and End; Tab moves from the row into the open panel. */}
        <Tabs value={tab} onValueChange={(value) => selectTab(String(value))} className="mt-6">
          <TabsList ref={tabRow} aria-label={t('landing.insideTitle')} activateOnFocus className={moreTabs ? 'scroll-fade' : ''}>
            {TAB_IDS.map((id) => (
              <TabsTrigger key={id} value={id}>
                {t(`nav.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {TAB_IDS.map((id) => (
            <TabsContent key={id} value={id} keepMounted tabIndex={0} className="rounded pt-6">
              {opened.includes(id) &&
                (id === 'lessons' ? (
                  <LessonsPanel {...data} done={done} next={next} />
                ) : id === 'challenges' ? (
                  <ChallengesPanel {...data} />
                ) : (
                  <LeaderboardPanel />
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section aria-labelledby="landing-how" className="mt-20">
        <h2 id="landing-how" className="text-2xl font-semibold tracking-tight">
          {t('landing.howTitle')}
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {(['watch', 'code', 'graded'] as const).map((step, index) => (
            <li key={step} className="flex gap-4">
              <CellMarker index={index} />
              <div>
                <h3 className="font-semibold">{t(`landing.how.${step}.title`)}</h3>
                <p className="mt-1 text-muted">
                  <TextWithCode text={t(`landing.how.${step}.body`)} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="landing-languages" className="mt-20 grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-2">
        <div>
          <h2 id="landing-languages" className="text-2xl font-semibold tracking-tight">
            {t('landing.languagesTitle')}
          </h2>
          <p className="mt-2 max-w-prose text-muted">{t('landing.codeLanguages')}</p>
          <ul className="mt-4 flex flex-wrap gap-2" lang="en" dir="ltr">
            {LANGUAGES.map((id) => (
              <li key={id} className="rounded border border-line bg-surface px-3 py-1.5 text-sm font-medium">
                {LANGUAGE_LABELS[id]}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-prose text-muted">{t('landing.bilingual')}</p>
        </div>
        <figure>
          {import.meta.env.SSR ? (
            captionPlaceholder
          ) : (
            <Suspense fallback={captionPlaceholder}>
              <BilingualCaption />
            </Suspense>
          )}
          <figcaption className="mt-2 text-sm text-muted">
            <TextWithCode text={t('landing.bilingualCaption')} />
          </figcaption>
        </figure>
      </section>

      {/* Visitors only: a logged-in user has Continue learning at the top. */}
      {!loading && !user && (
      <section aria-labelledby="landing-start" className="mt-20 rounded-lg bg-accent-soft px-6 py-8 sm:px-8">
        <h2 id="landing-start" className="text-2xl font-semibold tracking-tight">
          {t('landing.startTitle')}
        </h2>
        <p className="mt-2 max-w-prose">{t('landing.startBody')}</p>
        <Link to={firstLesson ? `/lessons/${firstLesson.slug}` : '/lessons'} className={`${primaryButton} mt-5`}>
          {t('landing.startFirst')}
        </Link>
      </section>
      )}
    </div>
  )
}
