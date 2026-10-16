import { useId, useMemo, useState, type FormEvent } from 'react'
import { bubbleSortFrames, insertionSortFrames, mergeSortFrames, type Frame } from './sortFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

const ALGORITHMS = {
  bubble: { label: 'Bubble sort', frames: bubbleSortFrames },
  insertion: { label: 'Insertion sort', frames: insertionSortFrames },
  merge: { label: 'Merge sort', frames: mergeSortFrames },
}
type Algorithm = keyof typeof ALGORITHMS

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

export default function SortingVisual() {
  const id = useId()
  const [algorithm, setAlgorithm] = useState<Algorithm>('bubble')
  const [array, setArray] = useState(randomArray)
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => ALGORITHMS[algorithm].frames(array), [algorithm, array])
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
            className="ml-2 rounded border border-field bg-surface px-2 py-1 text-sm hover:border-muted"
          >
            {Object.entries(ALGORITHMS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <SpeedSelect playback={playback} />
      </div>

      <div
        role="img"
        aria-label={`Array: ${current.array.join(', ') || 'empty'}`}
        className="mt-4 flex h-56 items-end gap-1 rounded border border-line bg-surface p-2 sm:gap-2 sm:p-3"
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

      <PlaybackControls playback={playback} />

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
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
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
