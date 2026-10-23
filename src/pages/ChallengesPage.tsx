import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, getChallenges, type ChallengeSummary } from '../api'
import { useAuth } from '../auth'
import Content from '../components/Content'
import DifficultyBadge from '../components/DifficultyBadge'
import EmptyState from '../components/EmptyState'
import { CheckIcon } from '../components/Icons'
import { LoadingRegion, SkeletonLines } from '../components/Loading'
import { Skeleton } from '../components/ui/skeleton'
import { textLang } from '../textLang'

const DIFFICULTIES = ['easy', 'medium', 'hard']
// Topic filter value for problems that belong to no lesson.
const STANDALONE = '-standalone'

const controlClass = 'mt-1 w-full rounded border border-field bg-surface px-2 py-1.5 text-sm hover:border-muted'

function SolvedMark({ solved }: { solved: boolean }) {
  const { t } = useTranslation()
  return solved ? (
    <span className="inline-flex text-pass">
      <CheckIcon />
      <span className="sr-only">{t('common.solved')}</span>
    </span>
  ) : (
    <span className="sr-only">{t('common.notSolved')}</span>
  )
}

export default function ChallengesPage() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')

  // solved depends on who is asking, so load again when the user logs in or out; titles depend on
  // the app language. The filters are kept.
  const userId = user?.id
  const language = i18n.language
  useEffect(() => {
    if (loading) return
    let active = true
    getChallenges()
      .then((list) => {
        if (active) setChallenges(list)
      })
      .catch((err) => {
        if (active) setFailure(err)
      })
    return () => {
      active = false
    }
  }, [loading, userId, language, reload])

  const error = failure === null ? '' : failure instanceof ApiError ? failure.message : t('challenges.loadFailed')

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setFailure(null)
    setReload((count) => count + 1)
  }

  // Topics in the order the list arrives (module order).
  const topics = new Map<string, string>()
  for (const challenge of challenges ?? []) {
    if (challenge.topic) topics.set(challenge.topic.slug, challenge.topic.title)
  }
  const hasStandalone = challenges?.some((challenge) => challenge.topic === null) ?? false

  // Searches the title as shown: Arabic where it is translated, English otherwise.
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
      <title>{t('titles.page', { name: t('challenges.title') })}</title>
      <h1 className="text-3xl font-semibold tracking-tight">{t('challenges.title')}</h1>
      <p className="mt-2 text-muted">{t('challenges.intro')}</p>

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
      {/* The filters with their real labels and empty control frames, the count line and the first rows
          (cards on a phone, the table from md). The list is long: a screen is held, so the footer stays out of view. */}
      {!error && challenges === null && (
        <LoadingRegion label={t('challenges.loading')} className="min-h-screen">
          <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${user ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {['challenges.search', 'challenges.difficulty', 'challenges.topic', ...(user ? ['challenges.status'] : [])].map((key) => (
              <div key={key}>
                <span className="text-sm font-medium">{t(key)}</span>
                <div className="mt-1 h-[2.125rem] rounded border border-line bg-surface" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SkeletonLines lines={1} className="w-28 text-sm" />
            <div className="h-[1.875rem] w-24 rounded border border-line bg-surface" />
          </div>
          <div className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface md:hidden">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="px-4 py-3">
                <SkeletonLines lines={1} className={row % 2 ? 'w-36' : 'w-48'} />
                <Skeleton className="mt-1 h-[1.375rem] w-40" />
              </div>
            ))}
          </div>
          <div className="mt-4 hidden divide-y divide-line rounded-lg border border-line bg-surface md:block">
            <div className="flex gap-8 px-4 py-2 text-sm">
              <SkeletonLines lines={1} className="w-32" />
              <SkeletonLines lines={1} className="w-24" />
            </div>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
              <div key={row} className="flex items-center gap-8 px-4 py-2">
                <SkeletonLines lines={1} className={row % 2 ? 'w-40' : 'w-56'} />
                <SkeletonLines lines={1} className="w-32 text-sm" />
              </div>
            ))}
          </div>
        </LoadingRegion>
      )}
      {challenges !== null && challenges.length === 0 && <EmptyState>{t('challenges.empty')}</EmptyState>}

      {challenges !== null && challenges.length > 0 && (
        <>
          <div className={`mt-6 grid gap-3 sm:grid-cols-2 ${user ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <div>
              <label htmlFor="challenge-search" className="text-sm font-medium">
                {t('challenges.search')}
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
                {t('challenges.difficulty')}
              </label>
              <select
                id="challenge-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className={controlClass}
              >
                <option value="">{t('challenges.allDifficulties')}</option>
                {DIFFICULTIES.map((option) => (
                  <option key={option} value={option}>
                    {t(`difficulty.${option}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="challenge-topic" className="text-sm font-medium">
                {t('challenges.topic')}
              </label>
              <select
                id="challenge-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className={controlClass}
              >
                <option value="">{t('challenges.allTopics')}</option>
                {[...topics].map(([slug, title]) => (
                  <option key={slug} value={slug} lang={textLang(title)} dir="auto">
                    {title}
                  </option>
                ))}
                {hasStandalone && <option value={STANDALONE}>{t('common.noTopic')}</option>}
              </select>
            </div>
            {user && (
              <div>
                <label htmlFor="challenge-status" className="text-sm font-medium">
                  {t('challenges.status')}
                </label>
                <select
                  id="challenge-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={controlClass}
                >
                  <option value="">{t('challenges.all')}</option>
                  <option value="solved">{t('common.solved')}</option>
                  <option value="unsolved">{t('challenges.unsolved')}</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-sm text-muted tabular-nums">
              {t('challenges.showing', { shown: shown.length, count: challenges.length })}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtered}
              className="rounded border border-field bg-surface px-3 py-1 text-sm hover:border-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('challenges.clearFilters')}
            </button>
          </div>

          {shown.length === 0 ? (
            <EmptyState className="mt-4">{t('challenges.noMatch')}</EmptyState>
          ) : (
            <>
              {/* Cards on narrow screens, a table from md up. */}
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface md:hidden">
                {shown.map((challenge) => (
                  <li key={challenge.slug} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user && <SolvedMark solved={challenge.solved} />}
                      <Link to={`/challenges/${challenge.slug}`} className="rounded font-medium text-accent hover:underline">
                        <Content lang="auto">{challenge.title}</Content>
                      </Link>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <DifficultyBadge difficulty={challenge.difficulty} />
                      <span className="tabular-nums">{t('common.points', { count: challenge.points })}</span>
                      {challenge.topic ? <Content lang="auto">{challenge.topic.title}</Content> : <span>{t('common.noTopic')}</span>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
                <table className="w-full text-start">
                  <thead className="border-b border-line text-sm text-muted">
                    <tr>
                      {user && (
                        <th scope="col" className="w-20 px-4 py-2 font-medium">
                          {t('challenges.status')}
                        </th>
                      )}
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t('challenges.columnTitle')}
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t('challenges.topic')}
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        {t('challenges.difficulty')}
                      </th>
                      <th scope="col" className="px-4 py-2 text-end font-medium">
                        {t('challenges.columnPoints')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {shown.map((challenge) => (
                      <tr key={challenge.slug} className="hover:bg-paper">
                        {user && (
                          <td className="px-4 py-2">
                            <SolvedMark solved={challenge.solved} />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <Link to={`/challenges/${challenge.slug}`} className="rounded text-accent hover:underline">
                            <Content lang="auto">{challenge.title}</Content>
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted">
                          {challenge.topic ? <Content lang="auto">{challenge.topic.title}</Content> : t('common.noTopic')}
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
