import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, getLeaderboard, getMyRank, type ChallengeSummary, type LeaderboardEntry, type LessonSummary, type Module, type MyRank } from '../api'
import { useAuth } from '../auth'
import { formatNumber, formatPercent } from '../i18n'
import { groupByTrack, trackName } from '../progress'
import { primaryButton } from './buttonStyles'
import Content from './Content'
import EmptyState from './EmptyState'
import { CheckIcon } from './Icons'
import { boardName, boardPoints, boardRank, boardRow } from './leaderboardStyles'
import { LoadingRegion, SkeletonLines } from './Loading'
import { Progress } from './ui/progress'
import { Skeleton } from './ui/skeleton'

// The three tab panels of the landing page. Personal parts (progress, solved, your rank) appear
// only once /me has answered and only for a logged-in user; a visitor never sees empty bars.

const DIFFICULTIES = ['easy', 'medium', 'hard']

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

// A labelled bar (Base UI, role="progressbar"); the count is also written next to it or in the
// sentence above, so it never depends on the bar alone.
function ProgressBar({ ratio, label, className }: { ratio: number; label: string; className?: string }) {
  const { t, i18n } = useTranslation()
  return (
    <Progress
      className={className}
      value={Math.round(ratio * 100)}
      aria-label={label}
      getAriaValueText={() => t('landing.progressValue', { percent: formatPercent(ratio, i18n.language) })}
    />
  )
}

// The summary card above the challenges list for a logged-in user: a sentence and a bar.
function SummarySkeleton() {
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <SkeletonLines lines={1} className="w-64 max-w-full" />
        <Skeleton className="mt-2 h-1.5 max-w-md rounded-full" />
      </div>
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

// The module grid: one row per track, as many columns of at least 13rem as fit, up to four (each
// column at least a quarter of the row). Cards past the columns that fit are display:none
// (container queries on the track), so the row never wraps and hidden cards leave the tab order.
// The breakpoints are where 2, 3 and 4 columns of 13rem with 0.5rem gaps fit.
const ROW_SIZE = 4
const MODULE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(max(13rem,calc(25%-0.375rem)),1fr))] gap-2'
const CARD_FITS = ['flex', 'hidden @min-[26.5rem]:flex', 'hidden @min-[40rem]:flex', 'hidden @min-[53.5rem]:flex']
// "See all" for a track of 2, 3 or 4 modules goes away from the width where all of them show.
const ALL_SHOWN_FROM: Record<number, string> = { 2: '@min-[26.5rem]:hidden', 3: '@min-[40rem]:hidden', 4: '@min-[53.5rem]:hidden' }
const moduleCard = 'min-h-11 w-full flex-col justify-center rounded-lg border bg-surface px-3 py-2.5'

// The modules a track's row shows, in course order: from the up-next module (or the track's first
// unfinished one), wrapping round to the earlier ones; for a visitor, the first ones.
function rowModules(trackModules: Module[], done: Set<string> | null, upNextId: string | null): Module[] {
  let start = trackModules.findIndex((module) => module.id === upNextId)
  if (start === -1 && done) start = trackModules.findIndex((module) => module.lessons.some((lesson) => !done.has(lesson.slug)))
  if (start === -1) start = 0
  return [...trackModules.slice(start), ...trackModules.slice(0, start)].slice(0, ROW_SIZE)
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
  // The first track with a row of module cards; most of a screen is held, so the sections below stay
  // out of view and nothing visible moves when the list arrives.
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
          {user && (
            <div className="flex min-h-[3.75rem] items-center rounded-lg border border-line bg-surface px-4 py-2">
              <SkeletonLines lines={1} className="w-64 max-w-full" />
            </div>
          )}
          <div className="mt-8 @container">
            <p className="text-lg font-semibold">{t('home.tracks.basics')}</p>
            <SkeletonLines lines={1} className="w-40 text-sm" />
            <div className={`mt-3 ${MODULE_GRID}`}>
              {CARD_FITS.map((fits, index) => (
                <div key={index} className={`${moduleCard} border-line ${fits}`}>
                  <SkeletonLines lines={1} className={index % 2 ? 'w-32' : 'w-40'} />
                  <SkeletonLines lines={1} className="mt-0.5 w-20 text-sm" />
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
  // A visitor's "up next" is the first module with lessons; a user's is the one holding the next
  // lesson (none until their progress has loaded, and none when every lesson is done).
  const upNextId = user ? (done ? (next?.module.id ?? null) : null) : (modules.find((module) => module.lessons.length > 0)?.id ?? null)
  const count = (value: number) => formatNumber(value, language)

  return (
    <div>
      {!loading && !user && <SignInHint text={t('landing.lessons.signIn')} />}
      {/* One slim row: where the user stands, and the next lesson as the one filled button. */}
      {user && done && (
        <div className="flex min-h-[3.75rem] flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-surface px-4 py-2">
          <p className="min-w-0 flex-[1_1_16rem]">
            {doneCount === 0
              ? t('landing.lessons.noneDone')
              : t('landing.lessons.summary', { count: total, done: count(doneCount), total: count(total), percent: formatPercent(doneCount / total, language) })}
          </p>
          {next ? (
            <Link to={`/lessons/${next.lesson.slug}`} className={`${primaryButton} max-w-full gap-1 px-4 text-sm`}>
              <span className="shrink-0">{doneCount === 0 ? t('landing.lessons.start') : t('landing.lessons.continue')}</span>
              <Content lang="auto" className="truncate">
                {next.lesson.title}
              </Content>
            </Link>
          ) : (
            <p className="font-medium text-pass">{t('landing.lessons.allDone')}</p>
          )}
        </div>
      )}

      {groupByTrack(modules).map(([track, trackModules]) => {
        const lessons = trackModules.reduce((sum, module) => sum + module.lessons.length, 0)
        const shown = rowModules(trackModules, done, upNextId)
        const name = t(`home.tracks.${track}`, { defaultValue: trackName(track) })
        return (
          <section key={track} aria-labelledby={`landing-track-${track}`} className="mt-8 @container">
            <h3 id={`landing-track-${track}`} className="text-lg font-semibold">
              {name}
            </h3>
            <p className="text-sm text-muted">
              {t('landing.lessons.trackMeta', {
                modules: t('landing.moduleCount', { count: trackModules.length, value: count(trackModules.length) }),
                lessons: t('landing.lessonCount', { count: lessons, value: count(lessons) }),
              })}
            </p>
            <ul className={`mt-3 ${MODULE_GRID}`}>
              {shown.map((module, index) => {
                const lessonTotal = module.lessons.length
                const moduleDone = done ? module.lessons.filter((lesson) => done.has(lesson.slug)).length : 0
                const finished = done !== null && lessonTotal > 0 && moduleDone === lessonTotal
                const started = done !== null && moduleDone > 0 && !finished
                const isNext = module.id === upNextId
                const target = module.lessons.find((lesson) => !done?.has(lesson.slug)) ?? module.lessons[0]
                const lessonsText = t('home.lessonCount', { count: lessonTotal, value: count(lessonTotal) })
                const progress = t('landing.lessons.moduleDone', { count: lessonTotal, done: count(moduleDone), total: count(lessonTotal) })
                const meta = started ? progress : lessonsText
                const body = (
                  <>
                    <span className="font-semibold text-ink">
                      <Content lang="auto">{module.title}</Content>
                    </span>
                    {finished ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted">
                        <CheckIcon className="size-4 shrink-0 text-pass" />
                        {t('landing.lessons.done')}
                      </span>
                    ) : (
                      <span className={`mt-0.5 text-sm ${isNext ? 'font-medium text-accent' : 'text-muted'}`}>
                        {isNext ? t('landing.lessons.upNextMeta', { meta }) : meta}
                      </span>
                    )}
                    {started && (
                      <ProgressBar
                        ratio={moduleDone / lessonTotal}
                        label={t('landing.lessons.moduleProgress', { module: module.title })}
                        className="mt-1.5 [&_[data-slot=progress-track]]:h-[3px]"
                      />
                    )}
                  </>
                )
                return (
                  <li key={module.id} className={CARD_FITS[index]}>
                    {target ? (
                      <Link to={`/lessons/${target.slug}`} className={`${moduleCard} flex hover:bg-hover ${isNext ? 'border-accent' : 'border-line'}`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={`${moduleCard} flex border-line`}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
            {/* Only while the track has modules the row does not show (more than four, or fewer
                columns than modules at this width). /lessons does not scroll to a #track- anchor. */}
            {trackModules.length > 1 && (
              <p className={`mt-1 ${trackModules.length > shown.length ? '' : ALL_SHOWN_FROM[trackModules.length]}`}>
                <Link to="/lessons" className="inline-flex min-h-11 items-center rounded text-sm text-accent underline underline-offset-2 sm:pointer-fine:min-h-8">
                  {t('landing.lessons.seeAll', { count: trackModules.length, value: count(trackModules.length), track: name })}
                </Link>
              </p>
            )}
          </section>
        )
      })}
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

// Rows asked for, and rows in the loading skeleton, so a full list doesn't push the page down.
const BOARD_LIMIT = 10

export function LeaderboardPanel() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const language = i18n.language
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [myRank, setMyRank] = useState<{ userId: string; rank: MyRank } | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)

  // is_you depends on who is asking, so load again on log in or out.
  const userId = user?.id
  useEffect(() => {
    if (loading) return
    let active = true
    getLeaderboard(BOARD_LIMIT)
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
  // The table with its real header and a row for each one asked for.
  if (entries === null) {
    return (
      <div className="max-w-2xl">
        <LoadingRegion label={t('leaderboard.loading')}>
          <div className="@container overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-start">
              <thead className="border-b border-line text-sm text-muted">
                <tr className={boardRow}>
                  <th className={`${boardRank} font-medium`}>{t('leaderboard.rank')}</th>
                  <th className={`${boardName} font-medium`}>{t('leaderboard.name')}</th>
                  <th className={`${boardPoints} font-medium`}>{t('leaderboard.points')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Array.from({ length: BOARD_LIMIT }, (_, row) => (
                  <tr key={row} className={boardRow}>
                    <td className={boardRank}>
                      <SkeletonLines lines={1} className="w-5" />
                    </td>
                    <td className={boardName}>
                      <SkeletonLines lines={1} className={row % 2 ? 'w-28' : 'w-40'} />
                    </td>
                    <td className={boardPoints}>
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
        // Clips only the row tints at the rounded corners; the table always fits (leaderboardStyles).
        <div className="@container overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full text-start">
            <caption className="sr-only">{t('landing.board.caption', { count: entries.length, value: formatNumber(entries.length, language) })}</caption>
            <thead className="border-b border-line text-sm text-muted">
              <tr className={boardRow}>
                <th scope="col" className={`${boardRank} font-medium`}>
                  {t('leaderboard.rank')}
                </th>
                <th scope="col" className={`${boardName} font-medium`}>
                  {t('leaderboard.name')}
                </th>
                <th scope="col" className={`${boardPoints} font-medium`}>
                  {t('leaderboard.points')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry, index) => {
                const isMe = user !== null && entry.is_you
                return (
                  <tr
                    key={index}
                    className={isMe ? `${boardRow} bg-accent-soft` : boardRow}
                    aria-current={isMe ? 'true' : undefined}
                  >
                    <td className={`${boardRank} text-muted`}>{formatNumber(entry.rank, language)}</td>
                    <td className={boardName}>
                      <span dir="auto">{entry.name}</span>
                      {isMe && <span className="ms-2 text-sm font-medium whitespace-nowrap text-accent">{t('leaderboard.you')}</span>}
                    </td>
                    <td className={boardPoints}>{formatNumber(entry.points, language)}</td>
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
