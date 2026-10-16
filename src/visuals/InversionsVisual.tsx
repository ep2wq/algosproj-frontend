import { useId, useMemo, useState, type FormEvent } from 'react'
import { inversionFrames, type InversionFrame } from './inversionFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

const MAX_NUMBERS = 8
const LIMIT = 1000000000 // the problem's value range: -1000000000 to 1000000000

// 8 numbers from 1 to 20, so duplicates appear.
function randomArray() {
  return Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 20))
}

// Returns the numbers, or an error message to show. Empty is allowed: the problem has n = 0.
function parseNumbers(text: string): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length > MAX_NUMBERS) return `Enter at most ${MAX_NUMBERS} numbers.`
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > LIMIT)) {
    return `Use whole numbers from -${LIMIT} to ${LIMIT}, separated by spaces or commas.`
  }
  return parts.map(Number)
}

const cellClass = 'flex h-10 min-w-10 items-center justify-center rounded border-2 px-1 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300'

function arrayCellStyle(frame: InversionFrame, index: number) {
  if (frame.done && frame.array.length > 0) return 'border-pass bg-surface text-ink'
  if (frame.range && index >= frame.range[0] && index < frame.range[1]) return 'border-accent bg-accent-soft text-ink'
  return 'border-line bg-surface text-muted'
}

// One sorted run with its pointer: taken numbers are dimmed, the next one is marked.
function Run({ label, values, pointer, mark }: { label: string; values: number[]; pointer: number; mark: string }) {
  const rest = values.slice(pointer)
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{label}</p>
      <div
        role="img"
        aria-label={`${label}: ${values.join(' ')}. ${rest.length === 0 ? 'All taken.' : `Waiting: ${rest.join(' ')}.`}`}
        className="mt-1 flex flex-wrap gap-x-1.5 gap-y-2 rounded border border-line bg-surface p-2"
      >
        {values.map((value, index) => (
          <div key={index} className="flex min-w-10 flex-col items-center">
            <span className="h-4 text-xs font-semibold text-ink">{index === pointer ? mark : ''}</span>
            <span
              className={`mt-0.5 ${cellClass} ${
                index < pointer ? 'border-line bg-paper text-muted' : index === pointer ? 'border-warn bg-surface text-ink' : 'border-muted bg-surface text-ink'
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function pairs(n: number) {
  const count = (n * (n - 1)) / 2
  return `${count} ${count === 1 ? 'pair' : 'pairs'}`
}

// Merge sort that counts inversions while it merges.
export default function InversionsVisual() {
  const id = useId()
  const [array, setArray] = useState(randomArray)
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => inversionFrames(array), [array])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const merging = current.range !== null

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
        aria-label={`Array: ${current.array.join(' ') || 'empty'}.${merging ? ` Merging positions ${current.range![0]} to ${current.range![1] - 1}.` : ''}`}
        className="mt-4 flex flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-surface p-3"
      >
        {current.array.length === 0 && <p className="text-sm text-muted">No numbers.</p>}
        {current.array.map((value, index) => (
          <div key={index} className="flex min-w-10 flex-col items-center">
            <span className={`${cellClass} ${arrayCellStyle(current, index)}`}>{value}</span>
            <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
          </div>
        ))}
      </div>

      {merging && (
        <>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Run label="Left half" values={current.left} pointer={current.leftPointer} mark="i" />
            <Run label="Right half" values={current.right} pointer={current.rightPointer} mark="j" />
          </div>
          <p className="mt-3 text-sm font-medium">Merged so far</p>
          <div
            role="img"
            aria-label={`Merged so far: ${current.merged.join(' ') || 'nothing yet'}.`}
            className="mt-1 flex min-h-14 flex-wrap gap-x-1.5 gap-y-2 rounded border border-line bg-surface p-2"
          >
            {current.merged.length === 0 && <p className="self-center text-sm text-muted">Nothing yet.</p>}
            {current.merged.map((value, index) => (
              <span
                key={index}
                className={`${cellClass} ${
                  current.took && index === current.merged.length - 1 ? 'border-accent bg-accent text-inverse' : 'border-muted bg-surface text-ink'
                }`}
              >
                {value}
              </span>
            ))}
          </div>
        </>
      )}

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-accent bg-accent-soft" aria-hidden="true" />
          Range being merged
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border-2 border-warn bg-surface" aria-hidden="true" />
          Next in each half (i, j)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-accent bg-accent" aria-hidden="true" />
          Just taken
        </li>
        <li>Small numbers: positions.</li>
      </ul>

      <p className="mt-3 inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-2">
        <span className="text-sm text-muted">Inversions so far</span>
        <span className={`text-xl font-semibold tabular-nums ${current.done ? 'text-pass' : 'text-ink'}`}>{current.total}</span>
      </p>

      {current.done && (
        <div className="mt-3">
          <p className="inline-block rounded border border-line bg-surface px-3 py-2 font-semibold">Inversions: {current.total}</p>
          <p className="mt-1 text-sm text-muted">Brute force would check {pairs(current.array.length)}.</p>
        </div>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomArray())} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
            Your own numbers
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-numbers`}
              type="text"
              autoComplete="off"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="e.g. 2 4 1 3 5"
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
            0 to {MAX_NUMBERS} whole numbers from -{LIMIT} to {LIMIT}, as in the problem (leave it empty for n = 0). Equal
            values are not inversions.
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
