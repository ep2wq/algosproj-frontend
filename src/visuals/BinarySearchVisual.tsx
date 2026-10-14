import { useId, useMemo, useState, type FormEvent } from 'react'
import { binarySearchFrames, type SearchFrame } from './binarySearchFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

const MAX_NUMBERS = 15

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// 10 distinct sorted numbers; the target is in the array about 2 times out of 3.
function randomCase() {
  const values = new Set<number>()
  while (values.size < 10) values.add(randomInt(1, 99))
  const array = [...values].sort((a, b) => a - b)
  let target = array[randomInt(0, array.length - 1)]
  if (Math.random() < 1 / 3) {
    do target = randomInt(1, 99)
    while (values.has(target))
  }
  return { array, target }
}

// Returns the sorted numbers, or an error message to show.
function parseNumbers(text: string): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return 'Enter at least one number.'
  if (parts.length > MAX_NUMBERS) return `Enter at most ${MAX_NUMBERS} numbers.`
  if (parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1 || Number(part) > 99)) {
    return 'Use whole numbers from 1 to 99, separated by spaces or commas.'
  }
  const numbers = parts.map(Number)
  if (new Set(numbers).size !== numbers.length) return 'Each number can only appear once.'
  return numbers.sort((a, b) => a - b)
}

function parseTarget(text: string): number | string {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1 || Number(trimmed) > 99) return 'The target must be a whole number from 1 to 99.'
  return Number(trimmed)
}

function inRange(frame: SearchFrame, index: number) {
  return frame.possible !== null && index >= frame.possible[0] && index <= frame.possible[1]
}

function cellStyle(frame: SearchFrame, index: number) {
  if (frame.result === index) return 'border-pass bg-pass text-white'
  if (frame.mid === index) return 'border-warn bg-warn text-white'
  if (inRange(frame, index)) return 'border-muted bg-white text-ink'
  return 'border-line bg-paper text-muted'
}

function pointerLabels(frame: SearchFrame, index: number) {
  const labels = []
  if (frame.low === index) labels.push('L')
  if (frame.mid === index) labels.push('M')
  if (frame.high === index) labels.push('H')
  return labels.join(' ')
}

const LEGEND = [
  { label: 'Middle being checked', style: 'border-warn bg-warn' },
  { label: 'Found', style: 'border-pass bg-pass' },
  { label: 'Still possible', style: 'border-muted bg-white' },
  { label: 'Ruled out', style: 'border-muted/40 bg-paper' },
]

export default function BinarySearchVisual() {
  const id = useId()
  const [initial] = useState(randomCase)
  const [array, setArray] = useState(initial.array)
  const [target, setTarget] = useState(initial.target)
  const [targetText, setTargetText] = useState(String(initial.target))
  const [targetError, setTargetError] = useState('')
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => binarySearchFrames(array, target), [array, target])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function handleRandom() {
    const next = randomCase()
    setArray(next.array)
    setTarget(next.target)
    setTargetText(String(next.target))
    setTargetError('')
    goTo(0)
  }

  function handleTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseTarget(targetText)
    if (typeof parsed === 'string') {
      setTargetError(parsed)
      return
    }
    setTargetError('')
    setTarget(parsed)
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
    setArray(parsed)
    goTo(0)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <form onSubmit={handleTarget} noValidate>
          <label htmlFor={`${id}-target`} className="text-sm font-medium">
            Target
          </label>
          <input
            id={`${id}-target`}
            type="text"
            inputMode="numeric"
            value={targetText}
            onChange={(event) => setTargetText(event.target.value)}
            aria-invalid={Boolean(targetError)}
            aria-describedby={targetError ? `${id}-target-error` : undefined}
            className={`ml-2 w-16 rounded border bg-white px-2 py-1 text-sm ${
              targetError ? 'border-fail' : 'border-line hover:border-muted'
            }`}
          />
          <button type="submit" className={`${buttonClass} ml-2 py-1`}>
            Search
          </button>
          {targetError && (
            <p id={`${id}-target-error`} role="alert" className="mt-1 text-sm text-fail">
              {targetError}
            </p>
          )}
        </form>
        <SpeedSelect playback={playback} />
      </div>

      <div
        role="img"
        aria-label={`Sorted array: ${current.array.join(', ')}. Target: ${target}.`}
        className="mt-4 flex flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-white p-3"
      >
        {current.array.map((value, index) => (
          <div key={index} className="flex w-10 flex-col items-center">
            <span className="h-4 text-xs font-semibold text-ink">{pointerLabels(current, index)}</span>
            <span
              className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${cellStyle(current, index)}`}
            >
              {value}
            </span>
            <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
          </div>
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LEGEND.map(({ label, style }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm border ${style}`} aria-hidden="true" />
            {label}
          </li>
        ))}
        <li>L, M, H: low, mid, high. Small numbers: indices.</li>
      </ul>

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={handleRandom} className={buttonClass}>
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
              inputMode="numeric"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="e.g. 4 15 8 23"
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
            Up to {MAX_NUMBERS} different numbers from 1 to 99, separated by spaces or commas. They are sorted for you.
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
