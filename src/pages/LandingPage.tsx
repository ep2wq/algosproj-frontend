import { Suspense, useEffect, useState } from 'react'
import { Box, SquareCode, StepForward } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { getChallenges, getModules, type ChallengeSummary, type Module } from '../api'
import { useAuth } from '../auth'
import { primaryButton, secondaryButton } from '../components/buttonStyles'
import CodeDemo from '../components/CodeDemo'
import GrowthChart from '../components/GrowthChart'
import { ChallengesPanel, LeaderboardPanel, LessonsPanel } from '../components/LandingPanels'
import { TextWithCode } from '../components/LessonBody'
import { CellLoader } from '../components/Loading'
import PageMeta from '../components/PageMeta'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { formatNumber } from '../i18n'
import { lessonsDone, nextLesson } from '../progress'
import { VISUALS } from '../visuals'
import { HERO_POOL } from '../visuals/heroPool'
import { useScrollCue } from '../visuals/useScrollCue'

// The tallest the hero visual gets at each width, over every step and every visual of HERO_POOL in
// English and Arabic (measured; the step text wraps more on a small phone), shared by the visual and
// its placeholder, so nothing moves when it arrives.
const HERO_HEIGHT = 'min-h-[25rem] min-[24rem]:min-h-[21.5rem] sm:min-h-[17.75rem] md:min-h-[18.5rem] lg:min-h-[19rem] xl:min-h-[21rem]'

const TAB_IDS = ['lessons', 'challenges', 'leaderboard']

// The three parts of a lesson, in order, with their icons.
const FEATURES = [
  { id: 'steps', Icon: StepForward },
  { id: 'code', Icon: SquareCode },
  { id: 'graded', Icon: Box },
] as const

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const [modules, setModules] = useState<Module[] | null>(null)
  // Who the list was loaded for: solved belongs to that user only.
  const [loaded, setLoaded] = useState<{ userId: string | null; list: ChallengeSummary[] } | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  // One visual of the pool per page view: picked once, so a re-render, the language or the theme
  // never swaps it. Only its code is loaded (lazy, like every visualization).
  const [hero] = useState(() => HERO_POOL[Math.floor(Math.random() * HERO_POOL.length)])
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
  const heroPlaceholder = <CellLoader className={HERO_HEIGHT} />

  return (
    <div>
      <PageMeta title={t('landing.metaTitle')} description={t('landing.metaDescription')} path="/" />

      {/* Stacked: the words at a reading width, then the visual across the page. */}
      <section aria-labelledby="landing-title">
        <div className="max-w-3xl lg:pt-6">
          <h1 id="landing-title" className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('landing.title')}
          </h1>
          <p className="mt-5 max-w-prose text-lg text-ink">
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
                  problems: t('landing.problemCount', { count: challenges.length, value: formatNumber(challenges.length, language) }),
                })
              : ' '}
          </p>
        </div>
        <div className="mt-10 rounded-lg border border-line bg-surface p-4 md:p-6">
          {/* A fact from the app itself (the lessons that ship a visualization), the same in the
              static HTML: not a live figure. */}
          <p className="inline-flex items-center gap-2 text-xs text-muted">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            <span>
              <Trans
                i18nKey="landing.visualBadge"
                count={VISUALS.size}
                values={{ value: formatNumber(VISUALS.size, language) }}
                components={{ num: <span className="font-mono font-bold text-ink" /> }}
              />
            </span>
          </p>
          {/* The static HTML (src/prerender.ts) gets the placeholder itself: renderToString can't
              wait for lazy code and would mark the boundary with an error. */}
          {import.meta.env.SSR ? (
            heroPlaceholder
          ) : (
            <Suspense fallback={heroPlaceholder}>
              <div className={`flex flex-col ${HERO_HEIGHT}`}>
                <hero.Visual demo={hero.demo} />
                {/* Where it comes from sits at the foot, as a 44 px link. */}
                <p className="mt-auto pt-1 text-sm text-muted">
                  <TextWithCode text={t(`landing.visualFrom.${hero.slug}`)} />{' '}
                  <Link to={`/lessons/${hero.slug}`} className="inline-flex min-h-11 items-center rounded text-accent underline underline-offset-2">
                    {t('landing.openLesson')}
                  </Link>
                </p>
              </div>
            </Suspense>
          )}
        </div>
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

      {/* One panel split into three cells by its own lines (stacked on a phone), not three cards. */}
      <section aria-labelledby="landing-features" className="mt-20">
        <h2 id="landing-features" className="text-2xl font-semibold tracking-tight">
          {t('landing.featuresTitle')}
        </h2>
        <ol className="mt-8 grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-3">
          {FEATURES.map(({ id, Icon }) => (
            <li key={id} className="border-line p-6 not-first:border-t md:not-first:border-t-0 md:not-first:border-s">
              <Icon aria-hidden="true" className="size-6 text-accent" strokeWidth={1.75} />
              <h3 className="mt-4 text-lg font-semibold">{t(`landing.features.${id}.title`)}</h3>
              <p className="mt-2 text-muted">
                <TextWithCode text={t(`landing.features.${id}.body`)} />
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="landing-growth" className="mt-20">
        <h2 id="landing-growth" className="text-2xl font-semibold tracking-tight">
          {t('landing.growth.title')}
        </h2>
        <p className="mt-2 max-w-prose text-muted">
          <TextWithCode text={t('landing.growth.intro')} />
        </p>
        <div className="mt-8">
          <GrowthChart />
        </div>
      </section>

      {/* Code is the subject here, so the section is the code itself: the four languages as tabs, and
          a fixed run in the words of the real result panel. */}
      <section aria-labelledby="landing-languages" className="mt-20">
        <h2 id="landing-languages" className="text-2xl font-semibold tracking-tight">
          {t('landing.languagesTitle')}
        </h2>
        <p className="mt-2 max-w-prose text-muted">{t('landing.codeLanguages')}</p>
        <div className="mt-8">
          <CodeDemo />
        </div>
        <p className="mt-6 max-w-prose text-muted">{t('landing.bilingual')}</p>
      </section>

      {/* Visitors only: a logged-in user has Continue learning at the top. Follows the theme (band in
          index.css): a white card in light, near black in dark; the button is the one filled thing. */}
      {!loading && !user && (
        <section
          aria-labelledby="landing-start"
          className="mt-20 grid items-end gap-x-10 gap-y-6 rounded-lg border border-line bg-band px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div>
            <h2 id="landing-start" className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {t('landing.ctaTitle')}
            </h2>
            <p className="mt-3 max-w-prose text-muted">{t('landing.startBody')}</p>
          </div>
          <Link
            to={firstLesson ? `/lessons/${firstLesson.slug}` : '/lessons'}
            className="inline-flex min-h-12 items-center justify-center rounded bg-accent px-6 font-semibold text-inverse hover:bg-accent/90 motion-safe:active:translate-y-px"
          >
            {t('landing.startFirst')}
          </Link>
        </section>
      )}
    </div>
  )
}
