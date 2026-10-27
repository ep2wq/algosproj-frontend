import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import i18n from '../i18n'
import { TextWithCode } from '../components/LessonBody'
import { binarySearchFrames } from './binarySearchFrames'
import './i18n'
import PlaybackControls, { buttonClass } from './PlaybackControls'
import SearchCells from './SearchCells'
import { usePlayback } from './usePlayback'

// A binary search that runs once by itself when the page opens, with the lesson's own frames,
// cells and playback controls. Silent (a page load makes no sound). With reduced motion it opens
// on the last step and nothing moves (usePlayback autoplay). The step text is not a live region:
// it would talk over the page while it plays.
function useAutoSearch(array: number[], target: number) {
  const { t } = useTranslation('visuals')
  const frames = useMemo(() => binarySearchFrames(array, target, t), [array, target, t])
  const playback = usePlayback(frames.length, { silent: true, autoplay: true })

  return { frames, playback, current: frames[Math.min(playback.step, playback.lastStep)] }
}

const HERO_ARRAY = [3, 8, 15, 21, 27, 34, 42, 56, 63, 78]
const HERO_TARGET = 42

// The landing page's first screen: the real binary search lesson, in miniature. One frame around
// the whole thing, as tall as LandingPage's placeholder; where it comes from sits at the foot, as a
// 44 px link.
export function HeroSearch() {
  const { t } = useTranslation('visuals')
  const { playback, current } = useAutoSearch(HERO_ARRAY, HERO_TARGET)

  return (
    <div className="flex min-h-[28.5rem] flex-col rounded-lg border border-line bg-surface p-4 sm:min-h-[23.25rem]">
      <SearchCells
        frame={current}
        regionLabel={t('binarySearch.region')}
        imageLabel={t('binarySearch.label', { values: current.array.join(', '), target: HERO_TARGET })}
      />
      <p className="mt-3 min-h-16 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>
      <PlaybackControls playback={playback} />
      <p className="mt-auto pt-1 text-sm text-muted">
        <TextWithCode text={t('landingSearch.from')} />{' '}
        <Link to="/lessons/binary-search" className="inline-flex min-h-11 items-center rounded text-accent underline underline-offset-2">
          {t('landingSearch.open')}
        </Link>
      </p>
    </div>
  )
}

// HTTP status codes, sorted, without 404.
const STATUS_CODES = [200, 201, 204, 301, 302, 400, 401, 403, 500, 503]
const NOT_FOUND = 404

// The 404 page: the same search, looking for 404 among the status codes and not finding it. The
// result line is announced once, when the search ends.
export function NotFoundSearch() {
  const { t } = useTranslation('visuals')
  const { playback, current } = useAutoSearch(STATUS_CODES, NOT_FOUND)
  const ended = playback.step >= playback.lastStep

  return (
    <div>
      <SearchCells
        frame={current}
        regionLabel={t('notFoundSearch.region')}
        imageLabel={t('notFoundSearch.label', { values: current.array.join(', '), target: NOT_FOUND })}
      />
      <p className="mt-3 min-h-16 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>
      {/* The punchline, announced once when the search ends; Search again sits next to it. */}
      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
        <p aria-live="polite" className="text-lg font-semibold">
          {ended && <TextWithCode text={t('notFoundSearch.result')} />}
        </p>
        <button type="button" onClick={playback.restart} className={buttonClass}>
          {t('notFoundSearch.replay')}
        </button>
      </div>
      <PlaybackControls playback={playback} />
    </div>
  )
}

// One step of the lesson's text in both languages, from the real translation files.
export function BilingualCaption() {
  const params = { value: HERO_TARGET, mid: HERO_ARRAY.indexOf(HERO_TARGET) }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['en', 'ar'] as const).map((language) => (
        <p
          key={language}
          lang={language}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="rounded-lg border border-line bg-surface px-4 py-3"
        >
          <TextWithCode text={i18n.getFixedT(language, 'visuals')('binarySearch.found', params)} />
        </p>
      ))}
    </div>
  )
}
