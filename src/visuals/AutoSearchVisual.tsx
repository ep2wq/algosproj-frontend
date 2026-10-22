import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import i18n from '../i18n'
import { TextWithCode } from '../components/LessonBody'
import { binarySearchFrames } from './binarySearchFrames'
import './i18n'
import PlaybackControls from './PlaybackControls'
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

// The landing page's first screen: the real binary search lesson, in miniature.
export function HeroSearch() {
  const { t } = useTranslation('visuals')
  const { playback, current } = useAutoSearch(HERO_ARRAY, HERO_TARGET)

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">
        <TextWithCode text={t('landingSearch.from')} />{' '}
        <Link to="/lessons/binary-search" className="rounded text-accent underline underline-offset-2">
          {t('landingSearch.open')}
        </Link>
      </p>
      <SearchCells
        frame={current}
        className="mt-3"
        regionLabel={t('binarySearch.region')}
        imageLabel={t('binarySearch.label', { values: current.array.join(', '), target: HERO_TARGET })}
      />
      <p className="mt-3 min-h-16 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>
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
