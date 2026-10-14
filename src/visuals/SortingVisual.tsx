import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { bubbleSortFrames, insertionSortFrames, mergeSortFrames, type Frame } from './sortFrames'

const ALGORITHMS = {
  bubble: { label: 'Bubble sort', frames: bubbleSortFrames },
  insertion: { label: 'Insertion sort', frames: insertionSortFrames },
  merge: { label: 'Merge sort', frames: mergeSortFrames },
}
type Algorithm = keyof typeof ALGORITHMS

// Milliseconds per step.
const SPEEDS = { slow: 1200, normal: 600, fast: 250 }
type Speed = keyof typeof SPEEDS

const MAX_NUMBERS = 12

function randomArray() {
  return Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 30))
}

// Returns the numbers, or an error message to show.
function parseNumbers(text: string): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return 'Enter at least one number.'
  if (parts.length > MAX_NUMBERS) return `Enter at most ${MAX_NUMBERS} numbers.`
  if (parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1 || Number(part) > 99)) {
    return 'Use whole numbers from 1 to 99, separated by spaces or commas.'
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
  { label: 'Compared', color: 'bg-warn' },
  { label: 'Swapped or written', color: 'bg-accent' },
  { label: 'In final place', color: 'bg-pass' },
]

const buttonClass = 'rounded border border-line bg-white px-3 py-1.5 text-sm hover:border-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

export default function SortingVisual() {
  const id = useId()
  const [algorithm, setAlgorithm] = useState<Algorithm>('bubble')
  const [array, setArray] = useState(randomArray)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => ALGORITHMS[algorithm].frames(array), [algorithm, array])
  const lastStep = frames.length - 1
  const current = frames[Math.min(step, lastStep)]
  const maxValue = Math.max(1, ...current.array)

  // One timeout per step. The cleanup clears it on pause, on any change and on unmount.
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (step + 1 >= lastStep) setPlaying(false)
      setStep(step + 1)
    }, SPEEDS[speed])
    return () => clearTimeout(timer)
  }, [playing, step, lastStep, speed])

  function restart(nextArray: number[], nextAlgorithm: Algorithm) {
    setArray(nextArray)
    setAlgorithm(nextAlgorithm)
    setStep(0)
    setPlaying(false)
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false)
      return
    }
    if (lastStep === 0) return
    if (step >= lastStep) setStep(0)
    setPlaying(true)
  }

  function goTo(nextStep: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(lastStep, nextStep)))
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseNumbers(customText)
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
            Algorithm
          </label>
          <select
            id={`${id}-algorithm`}
            value={algorithm}
            onChange={(event) => restart(array, event.target.value as Algorithm)}
            className="ml-2 rounded border border-line bg-white px-2 py-1 text-sm hover:border-muted"
          >
            {Object.entries(ALGORITHMS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-speed`} className="text-sm font-medium">
            Speed
          </label>
          <select
            id={`${id}-speed`}
            value={speed}
            onChange={(event) => setSpeed(event.target.value as Speed)}
            className="ml-2 rounded border border-line bg-white px-2 py-1 text-sm hover:border-muted"
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </div>
      </div>

      <div
        role="img"
        aria-label={`Array: ${current.array.join(', ') || 'empty'}`}
        className="mt-4 flex h-56 items-end gap-1 rounded border border-line bg-white p-2 sm:gap-2 sm:p-3"
      >
        {current.array.length === 0 && <p className="self-center text-sm text-muted">The array is empty.</p>}
        {current.array.map((value, index) => (
          <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="text-xs font-medium tabular-nums">{value}</span>
            <div
              className={`mt-0.5 w-full rounded-t motion-safe:transition-all motion-safe:duration-300 ${barColor(current, index)}`}
              style={{ height: `${(value / maxValue) * 85}%` }}
            />
          </div>
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LEGEND.map(({ label, color }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${color}`} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-disabled={lastStep === 0}
          className="min-w-20 rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => goTo(step - 1)} aria-disabled={step === 0} className={buttonClass}>
          Step back
        </button>
        <button type="button" onClick={() => goTo(step + 1)} aria-disabled={step >= lastStep} className={buttonClass}>
          Step forward
        </button>
        <button type="button" onClick={() => goTo(0)} className={buttonClass}>
          Reset
        </button>
        <span className="text-sm text-muted tabular-nums">
          Step {Math.min(step, lastStep) + 1} of {frames.length}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomArray(), algorithm)} className={buttonClass}>
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
              placeholder="e.g. 5 3 8 1"
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
            Up to {MAX_NUMBERS} numbers from 1 to 99, separated by spaces or commas.
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
