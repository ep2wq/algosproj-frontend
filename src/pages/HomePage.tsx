import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, getChallenges, getModules, type ChallengeSummary, type Module } from '../api'
import { useAuth } from '../auth'
import Content from '../components/Content'
import EmptyState from '../components/EmptyState'
import { CheckIcon } from '../components/Icons'

const DIFFICULTIES = ['easy', 'medium', 'hard']

// One to three filled bars; the word is for screen readers.
function DifficultyBars({ difficulty }: { difficulty: string }) {
  const { t } = useTranslation()
  const level = DIFFICULTIES.indexOf(difficulty) + 1
  const label = t(`difficulty.${difficulty}`, { defaultValue: difficulty })
  return (
    <span className="flex shrink-0 items-end gap-0.5" dir="ltr">
      {['h-1.5', 'h-2.5', 'h-3.5'].map((height, index) => (
        <span key={height} aria-hidden="true" className={`w-1 rounded-sm ${height} ${index < level ? 'bg-muted' : 'bg-line'}`} />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  )
}

// "data-structures" -> "Data structures"
function trackName(track: string): string {
  const words = track.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const [modules, setModules] = useState<Module[] | null>(null)
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)

  // Titles come in the app language, so load again when it changes (the old list stays until then).
  const language = i18n.language
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

  // Difficulty and solved cues. solved depends on who is asking, so load again on log in or out.
  const userId = user?.id
  useEffect(() => {
    if (loading) return
    let active = true
    getChallenges()
      .then((list) => {
        if (active) setChallenges(list)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [loading, userId, reload])

  const error = failure === null ? '' : failure instanceof ApiError ? failure.message : t('home.loadFailed')

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setFailure(null)
    setReload((count) => count + 1)
  }

  // Modules arrive in sort_order; group them by track, keeping that order.
  const tracks = new Map<string, Module[]>()
  for (const module of modules ?? []) {
    tracks.set(module.track, [...(tracks.get(module.track) ?? []), module])
  }

  // Each lesson's problems from the Challenges list: the hardest difficulty, and solved when every
  // problem is (solved is only true for the logged-in user). Extra cues only: the list never waits for it.
  const cues = new Map<string, { difficulty: string; solved: boolean }>()
  for (const challenge of challenges ?? []) {
    if (!challenge.lesson_slug) continue
    const cue = cues.get(challenge.lesson_slug)
    const harder = !cue || DIFFICULTIES.indexOf(challenge.difficulty) > DIFFICULTIES.indexOf(cue.difficulty)
    cues.set(challenge.lesson_slug, {
      difficulty: harder ? challenge.difficulty : cue.difficulty,
      solved: (cue?.solved ?? true) && challenge.solved,
    })
  }

  return (
    <div>
      <title>{t('titles.page', { name: t('home.title') })}</title>
      <h1 className="text-3xl font-semibold tracking-tight">{t('home.title')}</h1>
      <p className="mt-3 max-w-prose text-lg text-ink">{t('home.welcome')}</p>
      <p className="mt-1 max-w-prose text-muted">{t('home.intro')}</p>

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded border border-current px-3 py-1 text-sm font-medium hover:bg-fail/10"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      {!error && modules === null && <p className="mt-6 text-muted motion-safe:animate-appear motion-safe:[animation-delay:300ms]">{t('home.loading')}</p>}
      {modules !== null && modules.length === 0 && <EmptyState>{t('home.empty')}</EmptyState>}

      {[...tracks].map(([track, trackModules]) => (
        <section key={track} className="mt-12" aria-labelledby={`track-${track}`}>
          <div className="flex flex-wrap items-baseline gap-x-3 border-b border-line pb-2">
            <h2 id={`track-${track}`} className="text-2xl font-semibold tracking-tight">
              {t(`home.tracks.${track}`, { defaultValue: trackName(track) })}
            </h2>
            <span className="text-sm text-muted tabular-nums">
              {t('home.lessonCount', { count: trackModules.reduce((sum, module) => sum + module.lessons.length, 0) })}
            </span>
          </div>
          {/* Two columns from lg: each module keeps its top-to-bottom order and never splits. */}
          <div className="mt-5 gap-6 lg:columns-2">
            {trackModules.map((module) => (
              <div key={module.id} className="mb-5 break-inside-avoid rounded-lg border border-line bg-surface">
                <h3 className="border-b border-line px-4 py-2.5 font-semibold text-ink">
                  <Content lang="auto">{module.title}</Content>
                </h3>
                {module.lessons.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">{t('home.moduleEmpty')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {module.lessons.map((lesson) => {
                      const cue = cues.get(lesson.slug)
                      return (
                        <li key={lesson.id} className="group">
                          <Link
                            to={`/lessons/${lesson.slug}`}
                            className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-accent group-last:rounded-b-lg hover:bg-accent-soft"
                          >
                            {/* The wrapper keeps the page's alignment for a title in the other language. */}
                            <span className="min-w-0 flex-1">
                              <Content lang="auto">{lesson.title}</Content>
                            </span>
                            {user && cue?.solved && (
                              <span className="text-pass">
                                <CheckIcon />
                                <span className="sr-only">{t('common.solved')}</span>
                              </span>
                            )}
                            {cue && <DifficultyBars difficulty={cue.difficulty} />}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
