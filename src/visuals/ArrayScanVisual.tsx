import { useId, useMemo, useState, type FormEvent } from 'react'
import { maxFrames, sumFrames, type ScanMode } from './arrayScanFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

const MAX_NUMBERS = 12

const MODES = {
  sum: { frames: sumFrames, valueLabel: 'Running total' },
  max: { frames: maxFrames, valueLabel: 'Best so far' },
}

function randomArray() {
  return Array.from({ length: 8 }, () => -20 + Math.floor(Math.random() * 71))
}

// Returns the numbers, or an error message to show.
function parseNumbers(text: string): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return 'Enter at least one number.'
  if (parts.length > MAX_NUMBERS) return `Enter at most ${MAX_NUMBERS} numbers.`
  if (parts.some((part) => !/^-?\d+$/.test(part) || Number(part) < -99 || Number(part) > 99)) {
    return 'Use whole numbers from -99 to 99, separated by spaces or commas.'
  }
  return parts.map(Number)
}

// One left-to-right pass over an array: a running total (sum) or a running best (max).
export default function ArrayScanVisual({ mode }: { mode: ScanMode }) {
  const id = useId()
  const [array, setArray] = useState(randomArray)
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const { frames: makeFrames, valueLabel } = MODES[mode]
  const frames = useMemo(() => makeFrames(array), [makeFrames, array])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(nextArray: number[]) {
    setArray(nextArray)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseNumbers(customText)
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
        role="img"
        aria-label={`Array: ${current.array.join(', ')}. ${valueLabel}: ${current.value}.`}
        className="mt-4 flex flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-white p-3"
      >
        {current.array.map((value, index) => (
          <div key={index} className="flex w-10 flex-col items-center">
            <span className="h-4 text-xs font-semibold text-ink">{current.current === index ? 'i' : ''}</span>
            <span
              className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${
                current.current === index ? 'border-warn bg-warn text-white' : 'border-muted bg-white text-ink'
              }`}
            >
              {value}
            </span>
            <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
          </div>
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-warn bg-warn" aria-hidden="true" />
          Number being looked at (marked i)
        </li>
        <li>Small numbers: indices.</li>
      </ul>

      <p className="mt-3 inline-flex items-baseline gap-2 rounded border border-line bg-white px-3 py-2">
        <span className="text-sm text-muted">{valueLabel}</span>
        <span className={`text-xl font-semibold tabular-nums ${current.done ? 'text-pass' : 'text-ink'}`}>{current.value}</span>
      </p>

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomArray())} className={buttonClass}>
          New random array
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
            Your own numbers
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-numbers`}
              type="text"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="e.g. 10 -2 7 0 5"
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-numbers-hint${inputError ? ` ${id}-numbers-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-white px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-line hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use these
            </button>
          </div>
          <p id={`${id}-numbers-hint`} className="mt-1 text-xs text-muted">
            1 to {MAX_NUMBERS} whole numbers from -99 to 99, separated by spaces or commas.
          </p>
          {inputError && (
            <p id={`${id}-numbers-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
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
