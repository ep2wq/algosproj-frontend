import { useId, useMemo, useState, type FormEvent } from 'react'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { subarraySumFrames, type SumFrame } from './subarraySumFrames'
import { usePlayback } from './usePlayback'

// The problem's limits: up to 1000 values from -1000 to 1000 and k from -1000000 to
// 1000000; the visual shows at most 12 values.
const MAX_NUMBERS = 12
const MAX_VALUE = 1000
const MAX_K = 1000000

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// Small values with zeros and negatives; k is usually the sum of a random subarray, so
// there is at least one match.
function randomExample() {
  const values = Array.from({ length: randomInt(5, 9) }, () => randomInt(-3, 5))
  if (Math.random() < 0.2) return { values, k: randomInt(-5, 8) }
  const i = randomInt(0, values.length - 1)
  const j = randomInt(i, values.length - 1)
  return { values, k: values.slice(i, j + 1).reduce((total, value) => total + value, 0) }
}

type Field = 'values' | 'k'

function parseInput(valuesText: string, kText: string): { values: number[]; k: number } | { field: Field; message: string } {
  const parts = valuesText.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return { field: 'values', message: 'Enter at least one number.' }
  if (parts.length > MAX_NUMBERS) return { field: 'values', message: `Enter at most ${MAX_NUMBERS} numbers.` }
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > MAX_VALUE)) {
    return { field: 'values', message: `Use whole numbers from -${MAX_VALUE} to ${MAX_VALUE}, separated by spaces or commas.` }
  }
  const k = kText.trim()
  if (!/^-?\d+$/.test(k) || Math.abs(Number(k)) > MAX_K) return { field: 'k', message: `Enter k as one whole number from -${MAX_K} to ${MAX_K}.` }
  return { values: parts.map(Number), k: Number(k) }
}

function numberStyle(frame: SumFrame, index: number) {
  if (frame.read === index) return 'border-warn bg-warn text-white'
  if (frame.read !== null && index < frame.read) return 'border-line bg-paper text-muted'
  if (frame.read === null && frame.output !== null) return 'border-line bg-paper text-muted'
  return 'border-muted bg-white text-ink'
}

// Prefix j is the total of the first j numbers: j = 0 is the empty prefix.
function prefixStyle(frame: SumFrame, j: number) {
  if (frame.matches.includes(j)) return 'border-pass bg-pass text-white'
  if (frame.read !== null && j === frame.read + 1) return 'border-warn bg-white text-ink'
  if (frame.prefixes[j] === null) return 'border-dashed border-line bg-white text-muted'
  return 'border-muted bg-white text-ink'
}

function mapStyle(frame: SumFrame, sum: number) {
  if (frame.matches.length > 0 && frame.lookup === sum) return 'bg-pass text-white'
  if (frame.stored === sum) return 'bg-accent-soft'
  return ''
}

function diagramLabel(frame: SumFrame) {
  const known = frame.prefixes.filter((p) => p !== null)
  const reading = frame.read !== null ? ` Reading position ${frame.read}.` : ''
  return `Numbers: ${frame.values.join(' ')}. Totals so far, starting with the empty prefix: ${known.join(' ')}.${reading}`
}

function mapLabel(frame: SumFrame) {
  return `Map, total to times seen: ${frame.map.map((entry) => `${entry.sum} seen ${entry.times}`).join(', ')}.`
}

// Subarray sum equals k: running totals and a map of how often each total has appeared.
export default function SubarraySumVisual() {
  const id = useId()
  const [example, setExample] = useState(randomExample)
  const [valuesText, setValuesText] = useState('')
  const [kText, setKText] = useState('')
  const [inputError, setInputError] = useState<{ field: Field; message: string } | null>(null)

  const frames = useMemo(() => subarraySumFrames(example.values, example.k), [example])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(next: { values: number[]; k: number }) {
    setExample(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(valuesText, kText)
    if ('message' in parsed) {
      setInputError(parsed)
      return
    }
    setInputError(null)
    restart(parsed)
  }

  const describedBy = (field: Field) => `${id}-hint${inputError?.field === field ? ` ${id}-error` : ''}`
  const inputClass = (field: Field) =>
    `block w-full min-w-0 rounded border bg-white px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-line hover:border-muted'
    }`
  const sum = current.read !== null ? current.prefixes[current.read + 1] : current.output !== null ? current.prefixes[current.values.length] : 0

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['k', current.k],
          ['sum', sum],
          ['sum - k', current.lookup ?? '-'],
          ['count', current.count],
        ].map(([name, value]) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-white px-3 py-1.5">
            <span className="font-mono text-sm text-muted">{name}</span>
            <span className="text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Numbers and running totals, scrolls sideways when wider than the screen"
        className="mt-3 overflow-x-auto rounded border border-line bg-white p-3"
      >
        <div role="img" aria-label={diagramLabel(current)} className="flex w-max gap-1">
          <div className="flex flex-col pr-1 text-xs text-muted">
            <span className="mt-4 flex h-10 items-center">number</span>
            <span className="mt-1 flex h-10 items-center">sum</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="h-4 text-xs text-muted">start</span>
            <span className="flex h-10 min-w-14 items-center justify-center text-sm text-muted">-</span>
            <span
              className={`mt-1 flex h-10 min-w-14 items-center justify-center rounded border-2 px-1 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${prefixStyle(current, 0)}`}
            >
              {current.prefixes[0]}
            </span>
          </div>
          {current.values.map((value, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="h-4 text-xs text-muted tabular-nums">{index}</span>
              <span
                className={`flex h-10 min-w-14 items-center justify-center rounded border-2 px-1 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${numberStyle(current, index)}`}
              >
                {value}
              </span>
              <span
                className={`mt-1 flex h-10 min-w-14 items-center justify-center rounded border-2 px-1 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${prefixStyle(current, index + 1)}`}
              >
                {current.prefixes[index + 1] ?? ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm font-medium">Map: total to times seen</p>
      <div
        tabIndex={0}
        role="region"
        aria-label="Map of totals, scrolls sideways when wider than the screen"
        className="mt-1 overflow-x-auto rounded border border-line bg-white"
      >
        <table aria-label={mapLabel(current)} className="border-collapse text-sm tabular-nums">
          <tbody>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1 text-left text-xs font-medium text-muted">
                Total
              </th>
              {current.map.map((entry) => (
                <th key={entry.sum} scope="col" className={`min-w-12 px-2 py-1 text-center font-semibold motion-safe:transition-colors motion-safe:duration-300 ${mapStyle(current, entry.sum)}`}>
                  {entry.sum}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="row" className="px-2 py-1 text-left text-xs font-medium text-muted">
                Times
              </th>
              {current.map.map((entry) => (
                <td key={entry.sum} className={`min-w-12 px-2 py-1 text-center motion-safe:transition-colors motion-safe:duration-300 ${mapStyle(current, entry.sum)}`}>
                  {entry.times}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-warn bg-warn" aria-hidden="true" />
          Number being read
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border-2 border-warn bg-white" aria-hidden="true" />
          Its running total
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
          Earlier totals equal to sum - k
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-line bg-accent-soft" aria-hidden="true" />
          Stored in this step
        </li>
        <li>Small numbers: positions.</li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded border border-line bg-white px-3 py-2 font-semibold">
          Output: <span className="font-mono">{current.output}</span>
        </p>
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
              <label htmlFor={`${id}-values`} className="block text-sm font-medium">
                Your own numbers
              </label>
              <input
                id={`${id}-values`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={valuesText}
                onChange={(event) => setValuesText(event.target.value)}
                placeholder="e.g. 1 2 3"
                aria-invalid={inputError?.field === 'values'}
                aria-describedby={describedBy('values')}
                className={`mt-1 ${inputClass('values')}`}
              />
            </div>
            <div className="w-28">
              <label htmlFor={`${id}-k`} className="block text-sm font-medium">
                k
              </label>
              <input
                id={`${id}-k`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={kText}
                onChange={(event) => setKText(event.target.value)}
                placeholder="e.g. 3"
                aria-invalid={inputError?.field === 'k'}
                aria-describedby={describedBy('k')}
                className={`mt-1 ${inputClass('k')}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use these
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            1 to {MAX_NUMBERS} whole numbers from -{MAX_VALUE} to {MAX_VALUE}, and k from -{MAX_K} to {MAX_K}, as in the problem
            (which allows up to 1000 numbers).
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
