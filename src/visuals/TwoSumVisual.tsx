import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { pairsAddingUpTo, twoSumFrames, type TwoSumFrame } from './twoSumFrames'
import { usePlayback } from './usePlayback'
import { useCentreCells, useScrollCue } from './useScrollCue'

// The problem allows up to 2000 numbers; 12 is what fits on screen.
const MAX_NUMBERS = 12
const LIMIT = 100000000 // the problem's value range: -100000000 to 100000000

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// Built the way the problem guarantees: pick two positions, make their sum the target, and
// keep the example only if no other pair adds up to it.
function randomExample() {
  for (;;) {
    const values = Array.from({ length: randomInt(6, 8) }, () => randomInt(-20, 30))
    const i = randomInt(0, values.length - 2)
    const j = randomInt(i + 1, values.length - 1)
    const target = values[i] + values[j]
    if (pairsAddingUpTo(values, target).length === 1) return { values, target }
  }
}

// Returns the numbers and target, or an error message to show.
function parseInput(numbersText: string, targetText: string, t: T): { values: number[]; target: number } | string {
  const parts = numbersText.split(/[\s,]+/).filter(Boolean)
  if (parts.length < 2) return t('tree.atLeast', { count: 2 })
  if (parts.length > MAX_NUMBERS) return t('common.atMostNumbers', { count: MAX_NUMBERS })
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > LIMIT)) {
    return t('inversions.invalid', { limit: LIMIT })
  }
  if (!/^-?\d+$/.test(targetText.trim())) return t('twoSum.targetInvalid')
  const values = parts.map(Number)
  const target = Number(targetText.trim())
  const pairs = pairsAddingUpTo(values, target)
  if (pairs.length === 0) return t('twoSum.noPair', { target })
  if (pairs.length > 1) {
    const shown = pairs.map(([i, j]) => `${i} ${j}`).join(', ')
    return t('twoSum.manyPairs', { count: pairs.length, target, positions: shown })
  }
  return { values, target }
}

function cellStyle(frame: TwoSumFrame, index: number) {
  if (frame.answer?.includes(index)) return 'border-pass bg-pass text-inverse'
  if (frame.current === index) return 'border-warn bg-warn text-inverse'
  if (frame.current !== null && index < frame.current) return 'border-line bg-paper text-muted'
  return 'border-muted bg-surface text-ink'
}

function rowStyle(frame: TwoSumFrame, value: number) {
  if (frame.foundAt !== null && frame.partner === value) return 'bg-pass text-inverse'
  if (frame.stored === value) return 'bg-accent-soft'
  return ''
}

function mapLabel(frame: TwoSumFrame, t: T) {
  if (frame.map.length === 0) return t('twoSum.mapEmpty')
  const entries = frame.map.map((entry) => t('longestSubstring.mapEntry', { letter: entry.value, index: entry.index })).join(t('common.listSeparator'))
  return t('twoSum.mapLabel', { entries })
}

// Two Sum in one walk: look up target - value in a hash map, then store the value.
export default function TwoSumVisual() {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [example, setExample] = useState(randomExample)
  const [numbersText, setNumbersText] = useState('')
  const [targetText, setTargetText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => twoSumFrames(example.values, example.target, t), [example, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  // Only the first step reads no position: start at the beginning.
  const focusIndex = current.current ?? 0
  useCentreCells(scrollRef, focusIndex, focusIndex, example)

  function restart(next: { values: number[]; target: number }) {
    setExample(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(numbersText, targetText, t)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    setInputError('')
    restart(parsed)
  }

  const describedBy = `${id}-hint${inputError ? ` ${id}-error` : ''}`
  const inputClass = `block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${inputError ? 'border-fail' : 'border-field hover:border-muted'}`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <p className="mt-4 inline-flex items-baseline gap-2 rounded-lg border border-line bg-surface px-3 py-2">
        <span className="text-sm text-muted">
          <TextWithCode text={t('binarySearch.target')} />
        </span>
        <span dir="ltr" className="text-xl font-semibold tabular-nums">{current.target}</span>
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          tabIndex={0}
          role="region"
          aria-label={t('arrayScan.region')}
          dir="ltr"
          ref={scrollRef}
          className={`min-w-0 flex-1 overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
        >
          <div role="img" aria-label={t('twoSum.label', { values: current.values.join(' ') })} className="flex w-max gap-x-1.5">
            {current.values.map((value, index) => (
              <div key={index} data-index={index} className="flex min-w-10 flex-col items-center">
                <span className="h-4 text-xs font-semibold text-ink">{current.current === index ? 'i' : ''}</span>
                <span
                  className={`mt-0.5 flex h-10 min-w-10 items-center justify-center rounded border-2 px-1 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${cellStyle(current, index)}`}
                >
                  {value}
                </span>
                <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:w-44">
          <p className="text-sm font-medium">
            <TextWithCode text={t('twoSum.hashMap')} />
          </p>
          <table aria-label={mapLabel(current, t)} className="mt-1 w-full border-collapse rounded-lg border border-line bg-surface text-sm tabular-nums">
            <thead>
              <tr className="border-b border-line text-start text-xs text-muted">
                <th scope="col" className="px-2 py-1 font-medium">
                  {t('twoSum.value')}
                </th>
                <th scope="col" className="px-2 py-1 font-medium">
                  {t('longestSubstring.position')}
                </th>
              </tr>
            </thead>
            <tbody>
              {current.map.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-2 py-1.5 text-muted">
                    {t('stack.empty')}
                  </td>
                </tr>
              )}
              {current.map.map((entry) => (
                <tr key={entry.value} className={`border-b border-line last:border-b-0 motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${rowStyle(current, entry.value)}`}>
                  <td className="px-2 py-1.5">
                    <span dir="ltr">{entry.value}</span>
                  </td>
                  <td className="px-2 py-1.5">{entry.index}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-warn bg-warn" aria-hidden="true" />
          {t('stack.legendReading')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-line bg-accent-soft" aria-hidden="true" />
          {t('subarraySum.legendStored')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
          {t('twoSum.legendPair')}
        </li>
        <li>{t('common.smallPositions')}</li>
      </ul>

      {current.answer && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          <TextWithCode text={t('twoSum.answer', { answer: current.answer.join(' ') })} />
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomExample())} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
                {t('common.yourOwnNumbers')}
              </label>
              <input
                id={`${id}-numbers`}
                type="text"
                autoComplete="off"
                dir="ltr"
                value={numbersText}
                onChange={(event) => setNumbersText(event.target.value)}
                placeholder={t('twoSum.placeholderNumbers')}
                aria-invalid={Boolean(inputError)}
                aria-describedby={describedBy}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div className="w-28">
              <label htmlFor={`${id}-target`} className="block text-sm font-medium">
                <TextWithCode text={t('binarySearch.target')} />
              </label>
              <input
                id={`${id}-target`}
                type="text"
                autoComplete="off"
                dir="ltr"
                value={targetText}
                onChange={(event) => setTargetText(event.target.value)}
                placeholder={t('twoSum.placeholderTarget')}
                aria-invalid={Boolean(inputError)}
                aria-describedby={describedBy}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThese')}
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t('twoSum.hint', { max: MAX_NUMBERS, limit: LIMIT })} />
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
