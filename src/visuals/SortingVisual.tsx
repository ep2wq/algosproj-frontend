import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import type { T } from './i18n'
import { bubbleSortFrames, insertionSortFrames, mergeSortFrames, type Frame } from './sortFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

// The label of each is the key sorting.algorithms.<name>.
const ALGORITHMS = {
  bubble: bubbleSortFrames,
  insertion: insertionSortFrames,
  merge: mergeSortFrames,
}
type Algorithm = keyof typeof ALGORITHMS

const MAX_NUMBERS = 12

function randomArray() {
  return Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 30))
}

// Returns the numbers, or an error message to show.
function parseNumbers(text: string, t: T): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return t('common.atLeastOneNumber')
  if (parts.length > MAX_NUMBERS) return t('common.atMostNumbers', { count: MAX_NUMBERS })
  if (parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1 || Number(part) > 99)) {
    return t('binarySearch.invalid')
  }
  return parts.map(Number)
}

function barColor(frame: Frame, index: number) {
  if (frame.changed.includes(index)) return 'bg-accent'
  if (frame.compared.includes(index)) return 'bg-warn'
  if (frame.sorted.includes(index)) return 'bg-pass'
  return 'bg-muted/35'
}

const LEGEND = [
  { key: 'compared', color: 'bg-warn' },
  { key: 'changed', color: 'bg-accent' },
  { key: 'sorted', color: 'bg-pass' },
]

export default function SortingVisual() {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [algorithm, setAlgorithm] = useState<Algorithm>('bubble')
  const [array, setArray] = useState(randomArray)
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => ALGORITHMS[algorithm](array, t), [algorithm, array, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const maxValue = Math.max(1, ...current.array)

  function restart(nextArray: number[], nextAlgorithm: Algorithm) {
    setArray(nextArray)
    setAlgorithm(nextAlgorithm)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseNumbers(customText, t)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    setInputError('')
    restart(parsed, algorithm)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <label htmlFor={`${id}-algorithm`} className="text-sm font-medium">
            {t('sorting.algorithm')}
          </label>
          <select
            id={`${id}-algorithm`}
            value={algorithm}
            onChange={(event) => restart(array, event.target.value as Algorithm)}
            className="ms-2 rounded border border-field bg-surface px-2 py-1 text-sm hover:border-muted"
          >
            {Object.keys(ALGORITHMS).map((value) => (
              <option key={value} value={value}>
                {t(`sorting.algorithms.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <SpeedSelect playback={playback} />
      </div>

      <div
        role="img"
        aria-label={t('sorting.label', { values: current.array.join(', ') || t('sorting.emptyWord') })}
        dir="ltr"
        className="mt-4 flex h-56 items-end gap-1 rounded-lg border border-line bg-surface p-2 sm:gap-2 sm:p-3"
      >
        {current.array.length === 0 && (
          <p className="self-center text-sm text-muted">
            <TextWithCode text={t('sorting.emptyArray')} />
          </p>
        )}
        {current.array.map((value, index) => (
          <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="text-xs font-medium tabular-nums">{value}</span>
            <div
              className={`mt-0.5 w-full rounded-t motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-calm ${barColor(current, index)}`}
              style={{ height: `${(value / maxValue) * 85}%` }}
            />
          </div>
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LEGEND.map(({ key, color }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${color}`} aria-hidden="true" />
            {t(`sorting.legend.${key}`)}
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomArray(), algorithm)} className={buttonClass}>
          <TextWithCode text={t('common.newRandomArray')} />
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
            {t('common.yourOwnNumbers')}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id={`${id}-numbers`}
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={t('sorting.placeholder')}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-numbers-hint${inputError ? ` ${id}-numbers-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThese')}
            </button>
          </div>
          <p id={`${id}-numbers-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t('sorting.hint', { count: MAX_NUMBERS })} />
          </p>
          {inputError && (
            <p id={`${id}-numbers-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
