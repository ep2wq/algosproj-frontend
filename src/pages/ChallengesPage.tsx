import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, getChallenges, type ChallengeSummary } from '../api'
import ReportProblemButton from '../components/ReportProblemButton'
import { useAuth } from '../auth'
import Content from '../components/Content'
import DifficultyBadge from '../components/DifficultyBadge'
import EmptyState from '../components/EmptyState'
import FilterBar from '../components/FilterBar'
import { CheckIcon } from '../components/Icons'
import { LoadingRegion, SkeletonLines } from '../components/Loading'
import { cardList, headRow, num, row, table, tableCard, td, th } from '../components/tableStyles'
import { Skeleton } from '../components/ui/skeleton'
import { formatNumber } from '../i18n'
import { textLang } from '../textLang'

const DIFFICULTIES = ['easy', 'medium', 'hard']
// Topic filter value for problems that belong to no lesson.
const STANDALONE = '-standalone'

// Solved: a pass-coloured check; not solved: an empty circle (not a blank cell). Both say it in words
// for screen readers.
function SolvedMark({ solved }: { solved: boolean }) {
  const { t } = useTranslation()
  return solved ? (
    <span className="inline-flex size-5 shrink-0 items-center justify-center text-pass">
      <CheckIcon />
      <span className="sr-only">{t('common.solved')}</span>
    </span>
  ) : (
    <span className="inline-flex size-5 shrink-0 items-center justify-center">
      <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-field" />
      <span className="sr-only">{t('common.notSolved')}</span>
    </span>
  )
}

// The title in ink, underlined on hover; a solved one is muted, so the unsolved ones stand out.
function ChallengeLink({ challenge }: { challenge: ChallengeSummary }) {
  return (
    <Link
      to={`/challenges/${challenge.slug}`}
      className={`rounded font-medium underline-offset-4 hover:underline ${challenge.solved ? 'text-muted hover:text-ink' : 'text-ink'}`}
    >
      <Content lang="auto">{challenge.title}</Content>
    </Link>
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
    <div className="mx-auto max-w-4xl">
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
          <ReportProblemButton error={failure} />
        </div>
      )}
      {/* The filter bar's frame, the count line and the first rows (cards on a phone, the table from
          md). The list is long: a screen is held, so the footer stays out of view. */}
      {!error && challenges === null && (
        <LoadingRegion label={t('challenges.loading')} className="min-h-screen">
          <div className="mt-6 flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-2">
            <div className="h-11 min-w-0 flex-1 basis-56 rounded border border-line sm:pointer-fine:h-8" />
            {['challenges.difficulty', 'challenges.topic', ...(user ? ['challenges.status'] : [])].map((key) => (
              <div key={key} className="flex h-11 items-center rounded border border-line px-2.5 text-sm text-muted sm:pointer-fine:h-8">
                {t(key)}:
              </div>
            ))}
          </div>
          <SkeletonLines lines={1} className="mt-2 w-28 px-1 text-sm" />
          <div className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface md:hidden">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="px-4 py-3">
                <SkeletonLines lines={1} className={row % 2 ? 'w-36' : 'w-48'} />
                <Skeleton className="mt-1 h-[1.375rem] w-40" />
              </div>
            ))}
          </div>
          <div className="mt-4 hidden divide-y divide-line rounded-lg border border-line bg-surface md:block">
            <div className="flex gap-8 px-3 py-2 text-xs">
              <SkeletonLines lines={1} className="w-32" />
              <SkeletonLines lines={1} className="w-24" />
            </div>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
              <div key={row} className="flex h-11 items-center gap-8 px-3">
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
          <FilterBar
            label={t('filters.label')}
            search={{ id: 'challenge-search', label: t('challenges.search'), clearLabel: t('filters.clearSearch'), value: search, onChange: setSearch }}
            selects={[
              {
                id: 'challenge-difficulty',
                label: t('challenges.difficulty'),
                value: difficulty,
                onChange: setDifficulty,
                options: [{ value: '', label: t('challenges.all') }, ...DIFFICULTIES.map((option) => ({ value: option, label: t(`difficulty.${option}`) }))],
              },
              {
                id: 'challenge-topic',
                label: t('challenges.topic'),
                value: topic,
                onChange: setTopic,
                options: [
                  { value: '', label: t('challenges.all') },
                  ...[...topics].map(([slug, title]) => ({ value: slug, label: title, lang: textLang(title) })),
                  ...(hasStandalone ? [{ value: STANDALONE, label: t('common.noTopic') }] : []),
                ],
              },
              ...(user
                ? [
                    {
                      id: 'challenge-status',
                      label: t('challenges.status'),
                      value: status,
                      onChange: setStatus,
                      options: [
                        { value: '', label: t('challenges.all') },
                        { value: 'solved', label: t('common.solved') },
                        { value: 'unsolved', label: t('challenges.unsolved') },
                      ],
                    },
                  ]
                : []),
            ]}
            active={filtered}
            clearLabel={t('challenges.clearFilters')}
            onClear={clearFilters}
            meta={t('challenges.showing', { shown: formatNumber(shown.length, language), count: challenges.length })}
          />

          {shown.length === 0 ? (
            <EmptyState className="mt-4">{t('challenges.noMatch')}</EmptyState>
          ) : (
            <>
              {/* Cards on narrow screens, a table from md up. */}
              <ul className={cardList}>
                {shown.map((challenge) => (
                  <li key={challenge.slug} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user && <SolvedMark solved={challenge.solved} />}
                      <ChallengeLink challenge={challenge} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <DifficultyBadge difficulty={challenge.difficulty} />
                      <span className="tabular-nums">{t('common.points', { count: challenge.points })}</span>
                      {challenge.topic ? <Content lang="auto">{challenge.topic.title}</Content> : <span>{t('common.noTopic')}</span>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className={tableCard}>
                <table className={table}>
                  <colgroup>
                    {user && <col className="w-20" />}
                    <col />
                    <col className="w-1/4" />
                    <col className="w-28" />
                    <col className="w-20" />
                  </colgroup>
                  <thead className={headRow}>
                    <tr>
                      {user && (
                        <th scope="col" className={th}>
                          {t('challenges.status')}
                        </th>
                      )}
                      <th scope="col" className={th}>
                        {t('challenges.columnTitle')}
                      </th>
                      <th scope="col" className={th}>
                        {t('challenges.topic')}
                      </th>
                      <th scope="col" className={th}>
                        {t('challenges.difficulty')}
                      </th>
                      <th scope="col" className={`${th} text-end`}>
                        {t('challenges.columnPoints')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((challenge) => (
                      <tr key={challenge.slug} className={row}>
                        {user && (
                          <td className={td}>
                            <SolvedMark solved={challenge.solved} />
                          </td>
                        )}
                        <td className={td}>
                          <ChallengeLink challenge={challenge} />
                        </td>
                        <td className={`${td} text-muted`}>
                          {challenge.topic ? <Content lang="auto">{challenge.topic.title}</Content> : t('common.noTopic')}
                        </td>
                        <td className={td}>
                          <DifficultyBadge difficulty={challenge.difficulty} />
                        </td>
                        <td className={`${td} ${num}`}>{formatNumber(challenge.points, language)}</td>
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
