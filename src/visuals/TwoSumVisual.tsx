import { useId, useMemo, useState, type FormEvent } from 'react'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { pairsAddingUpTo, twoSumFrames, type TwoSumFrame } from './twoSumFrames'
import { usePlayback } from './usePlayback'

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
function parseInput(numbersText: string, targetText: string): { values: number[]; target: number } | string {
  const parts = numbersText.split(/[\s,]+/).filter(Boolean)
  if (parts.length < 2) return 'Enter at least 2 numbers.'
  if (parts.length > MAX_NUMBERS) return `Enter at most ${MAX_NUMBERS} numbers.`
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > LIMIT)) {
    return `Use whole numbers from -${LIMIT} to ${LIMIT}, separated by spaces or commas.`
  }
  if (!/^-?\d+$/.test(targetText.trim())) return 'Enter the target as one whole number.'
  const values = parts.map(Number)
  const target = Number(targetText.trim())
  const pairs = pairsAddingUpTo(values, target)
  if (pairs.length === 0) return `No pair adds up to ${target}. The problem guarantees exactly one.`
  if (pairs.length > 1) {
    const shown = pairs.map(([i, j]) => `${i} ${j}`).join(', ')
    return `${pairs.length} pairs add up to ${target} (positions ${shown}). The problem allows exactly one.`
  }
  return { values, target }
}

function cellStyle(frame: TwoSumFrame, index: number) {
  if (frame.answer?.includes(index)) return 'border-pass bg-pass text-white'
  if (frame.current === index) return 'border-warn bg-warn text-white'
  if (frame.current !== null && index < frame.current) return 'border-line bg-paper text-muted'
  return 'border-muted bg-white text-ink'
}

function rowStyle(frame: TwoSumFrame, value: number) {
  if (frame.foundAt !== null && frame.partner === value) return 'bg-pass text-white'
  if (frame.stored === value) return 'bg-accent-soft'
  return ''
}

function mapLabel(frame: TwoSumFrame) {
  if (frame.map.length === 0) return 'Map: empty.'
  return `Map, value to position: ${frame.map.map((entry) => `${entry.value} at ${entry.index}`).join(', ')}.`
}

// Two Sum in one walk: look up target - value in a hash map, then store the value.
export default function TwoSumVisual() {
  const id = useId()
  const [example, setExample] = useState(randomExample)
  const [numbersText, setNumbersText] = useState('')
  const [targetText, setTargetText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => twoSumFrames(example.values, example.target), [example])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(next: { values: number[]; target: number }) {
    setExample(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(numbersText, targetText)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    setInputError('')
    restart(parsed)
  }

  const describedBy = `${id}-hint${inputError ? ` ${id}-error` : ''}`
  const inputClass = `block w-full min-w-0 rounded border bg-white px-3 py-1.5 text-sm ${inputError ? 'border-fail' : 'border-line hover:border-muted'}`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <p className="mt-4 inline-flex items-baseline gap-2 rounded border border-line bg-white px-3 py-2">
        <span className="text-sm text-muted">Target</span>
        <span className="text-xl font-semibold tabular-nums">{current.target}</span>
      </p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          role="img"
          aria-label={`Numbers: ${current.values.join(' ')}.`}
          className="flex min-w-0 flex-1 flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-white p-3"
        >
          {current.values.map((value, index) => (
            <div key={index} className="flex min-w-10 flex-col items-center">
              <span className="h-4 text-xs font-semibold text-ink">{current.current === index ? 'i' : ''}</span>
              <span
                className={`mt-0.5 flex h-10 min-w-10 items-center justify-center rounded border-2 px-1 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${cellStyle(current, index)}`}
              >
                {value}
              </span>
              <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
            </div>
          ))}
        </div>

        <div className="sm:w-44">
          <p className="text-sm font-medium">Hash map</p>
          <table aria-label={mapLabel(current)} className="mt-1 w-full border-collapse rounded border border-line bg-white text-sm tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="px-2 py-1 font-medium">Value</th>
                <th scope="col" className="px-2 py-1 font-medium">Position</th>
              </tr>
            </thead>
            <tbody>
              {current.map.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-2 py-1.5 text-muted">
                    empty
                  </td>
                </tr>
              )}
              {current.map.map((entry) => (
                <tr key={entry.value} className={`border-b border-line last:border-b-0 motion-safe:transition-colors motion-safe:duration-300 ${rowStyle(current, entry.value)}`}>
                  <td className="px-2 py-1.5">{entry.value}</td>
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
          Being read (marked i)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-line bg-accent-soft" aria-hidden="true" />
          Stored in this step
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
          The pair
        </li>
        <li>Small numbers: positions.</li>
      </ul>

      {current.answer && (
        <p className="mt-3 inline-block rounded border border-line bg-white px-3 py-2 font-semibold">Answer: {current.answer.join(' ')}</p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomExample())} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
                Your own numbers
              </label>
              <input
                id={`${id}-numbers`}
                type="text"
                autoComplete="off"
                value={numbersText}
                onChange={(event) => setNumbersText(event.target.value)}
                placeholder="e.g. 2 7 11 15"
                aria-invalid={Boolean(inputError)}
                aria-describedby={describedBy}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div className="w-28">
              <label htmlFor={`${id}-target`} className="block text-sm font-medium">
                Target
              </label>
              <input
                id={`${id}-target`}
                type="text"
                autoComplete="off"
                value={targetText}
                onChange={(event) => setTargetText(event.target.value)}
                placeholder="e.g. 9"
                aria-invalid={Boolean(inputError)}
                aria-describedby={describedBy}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use these
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            2 to {MAX_NUMBERS} whole numbers from -{LIMIT} to {LIMIT}, and a target. As in the problem, exactly one pair of
            positions must add up to the target.
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
