import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, getLeaderboard, getMyRank, type ChallengeSummary, type LeaderboardEntry, type LessonSummary, type Module, type MyRank } from '../api'
import { useAuth } from '../auth'
import { formatNumber, formatPercent } from '../i18n'
import Content from './Content'
import EmptyState from './EmptyState'
import { CheckIcon } from './Icons'
import { LoadingRegion, SkeletonLines } from './Loading'
import { Skeleton } from './ui/skeleton'

// The three tab panels of the landing page. Personal parts (progress, solved, your rank) appear
// only once /me has answered and only for a logged-in user; a visitor never sees empty bars.

const DIFFICULTIES = ['easy', 'medium', 'hard']
const TRACKS = ['basics', 'data-structures', 'algorithms']

type Data = {
  modules: Module[] | null
  challenges: ChallengeSummary[] | null
  failure: unknown
  retry: () => void
}

function LoadError({ failure, fallback, retry }: { failure: unknown; fallback: string; retry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
      <p>{failure instanceof ApiError ? failure.message : fallback}</p>
      <button type="button" onClick={retry} className="mt-2 rounded border border-current px-3 py-1 text-sm font-medium hover:bg-fail/10">
        {t('common.tryAgain')}
      </button>
    </div>
  )
}

// A labelled bar; the percentage is also written next to it, so it never depends on the bar alone.
function ProgressBar({ ratio, label, valueText }: { ratio: number; label: string; valueText: string }) {
  const percent = Math.round(ratio * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className="h-1.5 overflow-hidden rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  )
}

// The summary card above the lessons and challenges lists for a logged-in user: a sentence and a bar,
// and on the lessons tab the box of the next lesson.
function SummarySkeleton({ next = false }: { next?: boolean }) {
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <SkeletonLines lines={1} className="w-64 max-w-full" />
        <Skeleton className="mt-2 h-1.5 max-w-md rounded-full" />
      </div>
      {next && <div className="h-[4.375rem] w-40 rounded-lg border border-line" />}
    </div>
  )
}

// Log in or register, for the parts that need an account.
function SignInHint({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <p className="rounded-lg border border-dashed border-field px-4 py-3 text-muted">
      {text}{' '}
      <Link to="/login" className="rounded text-accent underline underline-offset-2">
        {t('nav.logIn')}
      </Link>{' '}
      <span aria-hidden="true">·</span>{' '}
      <Link to="/register" className="rounded text-accent underline underline-offset-2">
        {t('landing.createAccount')}
      </Link>
    </p>
  )
}

export function LessonsPanel({
  modules,
  failure,
  retry,
  done,
  next,
}: Data & { done: Set<string> | null; next: { module: Module; lesson: LessonSummary } | null }) {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const language = i18n.language

  if (failure !== null && modules === null) return <LoadError failure={failure} fallback={t('home.loadFailed')} retry={retry} />
  // The first track with five module cards; most of a screen is held, so the sections below stay out
  // of view and nothing visible moves when the list arrives.
  if (modules === null) {
    return (
      <div>
        <LoadingRegion label={t('home.loading')} className="min-h-[70vh]">
          {/* The visitor's line. Before /me answers its space is kept but nothing shows, so a logged-in
              user never reads "Log in" and a visitor's list does not move. */}
          {!user && (
            <div className={loading ? 'invisible' : undefined}>
              <SignInHint text={t('landing.lessons.signIn')} />
            </div>
          )}
          {user && <SummarySkeleton next />}
          <div className="mt-8">
            <p className="text-lg font-semibold">{t('home.tracks.basics')}</p>
            <div className="mt-3 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent lg:grid-cols-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="flex flex-col bg-surface px-4 py-3 sm:rounded-lg sm:border sm:border-line sm:py-4">
                  <SkeletonLines lines={1} className={index % 2 ? 'w-32' : 'w-44'} />
                  {user ? (
                    <div className="mt-auto pt-2">
                      <SkeletonLines lines={1} className="w-28 text-sm" />
                      <Skeleton className="mt-1.5 h-1.5 rounded-full" />
                    </div>
                  ) : (
                    <SkeletonLines lines={1} className="mt-1 w-20 text-sm" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </LoadingRegion>
      </div>
    )
  }
  if (modules.length === 0) return <EmptyState className="">{t('home.empty')}</EmptyState>

  const total = modules.reduce((sum, module) => sum + module.lessons.length, 0)
  const doneCount = done ? modules.reduce((sum, module) => sum + module.lessons.filter((lesson) => done.has(lesson.slug)).length, 0) : 0

  return (
    <div>
      {!loading && !user && <SignInHint text={t('landing.lessons.signIn')} />}
      {user && done && (
        <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="font-medium">
              {doneCount === 0
                ? t('landing.lessons.noneDone')
                : t('landing.lessons.summary', {
                    count: total,
                    done: formatNumber(doneCount, language),
                    total: formatNumber(total, language),
                    percent: formatPercent(doneCount / total, language),
                  })}
            </p>
            <div className="mt-2 max-w-md">
              <ProgressBar
                ratio={total ? doneCount / total : 0}
                label={t('landing.lessons.overall')}
                valueText={formatPercent(total ? doneCount / total : 0, language)}
              />
            </div>
          </div>
          {next ? (
            <Link to={`/lessons/${next.lesson.slug}`} className="rounded-lg border border-accent bg-accent-soft px-4 py-3 hover:bg-accent-soft/60">
              <span className="block text-sm text-muted">{t('landing.lessons.nextUp')}</span>
              <span className="block font-semibold text-accent">
                <Content lang="auto">{next.lesson.title}</Content>
              </span>
            </Link>
          ) : (
            <p className="text-pass">{t('landing.lessons.allDone')}</p>
          )}
        </div>
      )}

      {TRACKS.filter((track) => modules.some((module) => module.track === track)).map((track) => (
        <div key={track} className="mt-8">
          <h3 className="text-lg font-semibold">{t(`home.tracks.${track}`)}</h3>
          {/* One joined list on a phone, separate cards from sm. */}
          <ul className="mt-3 grid overflow-hidden rounded-lg border border-line bg-line gap-px sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent lg:grid-cols-3">
            {modules
              .filter((module) => module.track === track)
              .map((module) => {
                const moduleDone = done ? module.lessons.filter((lesson) => done.has(lesson.slug)).length : 0
                const ratio = module.lessons.length ? moduleDone / module.lessons.length : 0
                const target = module.lessons.find((lesson) => !done?.has(lesson.slug)) ?? module.lessons[0]
                const isNext = user !== null && next?.module.id === module.id
                return (
                  <li
                    key={module.id}
                    className={`flex flex-col bg-surface px-4 py-3 sm:rounded-lg sm:border sm:py-4 ${isNext ? 'inset-ring-2 inset-ring-accent sm:inset-ring-0 sm:border-accent' : 'sm:border-line'}`}
                  >
                    <h4 className="font-semibold">
                      {target ? (
                        <Link to={`/lessons/${target.slug}`} className="rounded text-accent hover:underline">
                          <Content lang="auto">{module.title}</Content>
                        </Link>
                      ) : (
                        <Content lang="auto">{module.title}</Content>
                      )}
                    </h4>
                    {/* With progress shown, "2 of 4 lessons done" already gives the count. */}
                    {!(user && done && module.lessons.length > 0) && (
                      <p className="mt-1 text-sm text-muted">
                        {t('home.lessonCount', { count: module.lessons.length, value: formatNumber(module.lessons.length, language) })}
                      </p>
                    )}
                    {user && done && module.lessons.length > 0 && (
                      <div className="mt-auto pt-2">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="text-muted">
                            {t('landing.lessons.moduleDone', {
                              count: module.lessons.length,
                              done: formatNumber(moduleDone, language),
                              total: formatNumber(module.lessons.length, language),
                            })}
                          </span>
                          <span className="font-medium tabular-nums">{formatPercent(ratio, language)}</span>
                        </div>
                        <div className="mt-1.5">
                          <ProgressBar
                            ratio={ratio}
                            label={t('landing.lessons.moduleProgress', { module: module.title })}
                            valueText={formatPercent(ratio, language)}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function ChallengesPanel({ challenges, failure, retry }: Data) {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const language = i18n.language

  if (failure !== null && challenges === null) return <LoadError failure={failure} fallback={t('challenges.loadFailed')} retry={retry} />
  // The three difficulty groups with their real headings and "Show problems" lines.
  if (challenges === null) {
    return (
      <div>
        <LoadingRegion label={t('challenges.loading')}>
          {/* The visitor's line. Before /me answers its space is kept but nothing shows, so a logged-in
              user never reads "Log in" and a visitor's list does not move. */}
          {!user && (
            <div className={loading ? 'invisible' : undefined}>
              <SignInHint text={t('landing.challenges.signIn')} />
            </div>
          )}
          {user && <SummarySkeleton />}
          <div className="mt-6 space-y-3">
            {DIFFICULTIES.map((difficulty) => (
              <div key={difficulty} className="rounded-lg border border-line bg-surface">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4">
                  <span className="font-semibold">{t(`difficulty.${difficulty}`)}</span>
                  <SkeletonLines lines={1} className="w-20 text-sm" />
                  <SkeletonLines lines={1} className="w-24 text-sm" />
                </div>
                <div className="px-4 pt-2 pb-3">
                  <span className="inline-flex min-h-11 items-center text-sm text-accent">{t('landing.challenges.show')}</span>
                </div>
              </div>
            ))}
          </div>
        </LoadingRegion>
        <p className="mt-4">
          <Link to="/challenges" className="rounded text-accent underline underline-offset-2">
            {t('landing.challenges.all')}
          </Link>
        </p>
      </div>
    )
  }
  if (challenges.length === 0) return <EmptyState className="">{t('challenges.empty')}</EmptyState>

  // Points come from each problem in the API, never from a table here.
  const totalPoints = challenges.reduce((sum, challenge) => sum + challenge.points, 0)
  const earned = challenges.reduce((sum, challenge) => sum + (challenge.solved ? challenge.points : 0), 0)
  const groups = DIFFICULTIES.map((difficulty) => ({
    difficulty,
    items: challenges.filter((challenge) => challenge.difficulty === difficulty),
  })).filter((group) => group.items.length > 0)

  return (
    <div>
      {!loading && !user && <SignInHint text={t('landing.challenges.signIn')} />}
      {user && (
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="font-medium">
            {t('landing.challenges.earned', {
              count: totalPoints,
              earned: formatNumber(earned, language),
              total: formatNumber(totalPoints, language),
            })}
          </p>
          <div className="mt-2 max-w-md">
            <ProgressBar
              ratio={totalPoints ? earned / totalPoints : 0}
              label={t('landing.challenges.overall')}
              valueText={formatPercent(totalPoints ? earned / totalPoints : 0, language)}
            />
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {groups.map(({ difficulty, items }) => {
          const points = new Set(items.map((item) => item.points))
          const solved = items.filter((item) => item.solved)
          return (
            <section key={difficulty} aria-labelledby={`landing-${difficulty}`} className="rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4">
                <h3 id={`landing-${difficulty}`} className="font-semibold">
                  {t(`difficulty.${difficulty}`)}
                </h3>
                <span className="text-sm text-muted">
                  {t('landing.challenges.problems', { count: items.length, value: formatNumber(items.length, language) })}
                </span>
                {points.size === 1 && (
                  <span className="text-sm text-muted">
                    {t('landing.challenges.pointsEach', { count: items[0].points, value: formatNumber(items[0].points, language) })}
                  </span>
                )}
                {user && (
                  <span className="text-sm font-medium sm:ms-auto">
                    {t('landing.challenges.solved', {
                      count: items.length,
                      solved: formatNumber(solved.length, language),
                      total: formatNumber(items.length, language),
                    })}
                  </span>
                )}
              </div>
              <details className="group px-4 pt-2 pb-3">
                <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded text-sm text-accent hover:underline">
                  {t('landing.challenges.show')}
                </summary>
                <ul className="mt-1 grid gap-x-6 md:grid-cols-2">
                  {items.map((item) => (
                    <li key={item.slug} className="flex min-h-10 items-center gap-2 border-t border-line py-2 text-sm">
                      <span className="w-4 shrink-0 text-pass">
                        {user && item.solved && <CheckIcon />}
                        {user && <span className="sr-only">{item.solved ? t('common.solved') : t('common.notSolved')}</span>}
                      </span>
                      <Link to={`/challenges/${item.slug}`} className="min-w-0 flex-1 rounded text-ink hover:text-accent hover:underline">
                        <Content lang="auto">{item.title}</Content>
                      </Link>
                      <span className="shrink-0 text-muted tabular-nums">
                        {t('common.points', { count: item.points, value: formatNumber(item.points, language) })}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )
        })}
      </div>
      <p className="mt-4">
        <Link to="/challenges" className="rounded text-accent underline underline-offset-2">
          {t('landing.challenges.all')}
        </Link>
      </p>
    </div>
  )
}

export function LeaderboardPanel() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const language = i18n.language
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [myRank, setMyRank] = useState<{ userId: number; rank: MyRank } | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)

  // is_you depends on who is asking, so load again on log in or out.
  const userId = user?.id
  useEffect(() => {
    if (loading) return
    let active = true
    getLeaderboard(10)
      .then((list) => {
        if (active) setEntries(list)
      })
      .catch((err) => {
        if (active) setFailure(err)
      })
    if (userId !== undefined) {
      getMyRank()
        .then((rank) => {
          if (active) setMyRank({ userId, rank })
        })
        .catch(() => {
          // Not critical: the list still shows.
        })
    }
    return () => {
      active = false
    }
  }, [loading, userId, reload])

  function retry() {
    document.getElementById('main')?.focus()
    setFailure(null)
    setReload((count) => count + 1)
  }

  if (failure !== null) return <LoadError failure={failure} fallback={t('leaderboard.loadFailed')} retry={retry} />
  // The table with its real header and three rows.
  if (entries === null) {
    return (
      <div className="max-w-2xl">
        <LoadingRegion label={t('leaderboard.loading')}>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-start">
              <thead className="border-b border-line text-sm text-muted">
                <tr>
                  <th className="w-16 px-4 py-2 font-medium">{t('leaderboard.rank')}</th>
                  <th className="px-4 py-2 font-medium">{t('leaderboard.name')}</th>
                  <th className="px-4 py-2 text-end font-medium">{t('leaderboard.points')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[0, 1, 2].map((row) => (
                  <tr key={row}>
                    <td className="px-4 py-2">
                      <SkeletonLines lines={1} className="w-5" />
                    </td>
                    <td className="px-4 py-2">
                      <SkeletonLines lines={1} className={row % 2 ? 'w-28' : 'w-40'} />
                    </td>
                    <td className="px-4 py-2">
                      <SkeletonLines lines={1} className="ms-auto w-12" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LoadingRegion>
      </div>
    )
  }

  const rank = user && myRank?.userId === user.id ? myRank.rank : null
  const listed = user !== null && entries.some((entry) => entry.is_you)

  return (
    <div className="max-w-2xl">
      {entries.length === 0 ? (
        <EmptyState className="">{t('leaderboard.empty')}</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-start">
            <caption className="sr-only">{t('landing.board.caption', { count: entries.length, value: formatNumber(entries.length, language) })}</caption>
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="w-16 px-4 py-2 font-medium">
                  {t('leaderboard.rank')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('leaderboard.name')}
                </th>
                <th scope="col" className="px-4 py-2 text-end font-medium">
                  {t('leaderboard.points')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry, index) => {
                const isMe = user !== null && entry.is_you
                return (
                  <tr key={index} className={isMe ? 'bg-accent-soft' : undefined} aria-current={isMe ? 'true' : undefined}>
                    <td className="px-4 py-2 text-muted tabular-nums">{formatNumber(entry.rank, language)}</td>
                    <td className="px-4 py-2">
                      <span dir="auto" className="break-words">
                        {entry.name}
                      </span>
                      {isMe && <span className="ms-2 text-sm font-medium text-accent">{t('leaderboard.you')}</span>}
                    </td>
                    <td className="px-4 py-2 text-end tabular-nums">{formatNumber(entry.points, language)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Your own place, under the list when you are not in it. */}
      {rank && !listed && (
        <p className="mt-3 rounded-lg border border-accent bg-accent-soft px-4 py-3">
          {rank.points === 0
            ? t('landing.board.notRanked')
            : t('landing.board.you', {
                count: rank.points,
                rank: formatNumber(rank.rank, language),
                points: formatNumber(rank.points, language),
              })}
        </p>
      )}
      {!loading && !user && (
        <p className="mt-3 text-muted">
          {t('landing.board.signUp')}{' '}
          <Link to="/register" className="rounded text-accent underline underline-offset-2">
            {t('landing.createAccount')}
          </Link>
        </p>
      )}
      <p className="mt-4">
        <Link to="/leaderboard" className="rounded text-accent underline underline-offset-2">
          {t('landing.board.full')}
        </Link>
      </p>
    </div>
  )
}
