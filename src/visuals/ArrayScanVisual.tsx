import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { maxFrames, sumFrames, type ScanMode } from './arrayScanFrames'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import { useCentreCells, useScrollCue } from './useScrollCue'

const MAX_NUMBERS = 12

const MODES = { sum: sumFrames, max: maxFrames }

function randomArray() {
  return Array.from({ length: 8 }, () => -20 + Math.floor(Math.random() * 71))
}

// Returns the numbers, or an error message to show.
function parseNumbers(text: string, t: T): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return t('common.atLeastOneNumber')
  if (parts.length > MAX_NUMBERS) return t('common.atMostNumbers', { count: MAX_NUMBERS })
  if (parts.some((part) => !/^-?\d+$/.test(part) || Number(part) < -99 || Number(part) > 99)) {
    return t('arrayScan.invalid')
  }
  return parts.map(Number)
}

// One left-to-right pass over an array: a running total (sum) or a running best (max).
export default function ArrayScanVisual({ mode }: { mode: ScanMode }) {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [array, setArray] = useState(randomArray)
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const makeFrames = MODES[mode]
  const valueLabel = mode === 'sum' ? t('arrayScan.runningTotal') : t('arrayScan.bestSoFar')
  const frames = useMemo(() => makeFrames(array, t), [makeFrames, array, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  // Before the first step the row starts at the beginning; after the last it stays at the end.
  const focusIndex = current.current ?? (current.done ? current.array.length - 1 : 0)
  useCentreCells(scrollRef, focusIndex, focusIndex, array)

  function restart(nextArray: number[]) {
    setArray(nextArray)
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
    restart(parsed)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={t('arrayScan.region')}
        dir="ltr"
        ref={scrollRef}
        className={`mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
      >
        <div
          role="img"
          aria-label={mode === 'sum' ? t('arrayScan.labelSum', { values: current.array.join(', '), value: current.value }) : t('arrayScan.labelMax', { values: current.array.join(', '), value: current.value })}
          className="flex w-max gap-x-1.5"
        >
          {current.array.map((value, index) => (
            <div key={index} data-index={index} className="flex w-10 flex-col items-center">
              <span className="h-4 text-xs font-semibold text-ink">{current.current === index ? 'i' : ''}</span>
              <span
                className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${
                  current.current === index ? 'border-warn bg-warn text-inverse' : 'border-muted bg-surface text-ink'
                }`}
              >
                {value}
              </span>
              <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-warn" aria-hidden="true" />
          {t('arrayScan.legendCurrent')}
        </li>
        <li>
          <TextWithCode text={t('common.smallIndices')} />
        </li>
      </ul>

      <p className="mt-3 inline-flex items-baseline gap-2 rounded-lg border border-line bg-surface px-3 py-2">
        <span className="text-sm text-muted">
          <TextWithCode text={valueLabel} />
        </span>
        <span dir="ltr" className={`text-xl font-semibold tabular-nums ${current.done ? 'text-pass' : 'text-ink'}`}>{current.value}</span>
      </p>

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomArray())} className={buttonClass}>
          <TextWithCode text={t('common.newRandomArray')} />
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
            {t('common.yourOwnNumbers')}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-numbers`}
              type="text"
              dir="ltr"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={t('arrayScan.placeholder')}
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
            <TextWithCode text={t('arrayScan.hint', { count: MAX_NUMBERS })} />
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

export function SumVisual() {
  return <ArrayScanVisual mode="sum" />
}

export function MaxVisual() {
  return <ArrayScanVisual mode="max" />
}
