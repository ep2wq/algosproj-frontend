import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { binarySearchFrames } from './binarySearchFrames'
import './i18n'
import PlaybackControls, { buttonClass, demoCaptionClass } from './PlaybackControls'
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

// The binary search entry of the landing page's card (heroPool.ts): the real lesson, in miniature,
// across the page. LandingPage draws the card, its height and the line naming the lesson.
export function HeroSearch({ demo }: { demo: { array: number[]; target: number } }) {
  const { t } = useTranslation('visuals')
  const { playback, current } = useAutoSearch(demo.array, demo.target)

  return (
    <div>
      <SearchCells
        frame={current}
        large
        framed={false}
        className="mt-3"
        regionLabel={t('binarySearch.region')}
        imageLabel={t('binarySearch.label', { values: current.array.join(', '), target: demo.target })}
      />
      <p className={demoCaptionClass}>
        <TextWithCode text={current.description} />
      </p>
      <PlaybackControls playback={playback} wide />
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
