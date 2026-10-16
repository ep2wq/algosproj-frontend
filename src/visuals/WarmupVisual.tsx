import { useId, useMemo, useState, type FormEvent } from 'react'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import { SOLUTIONS, warmupFrames, type WarmupFrame } from './warmupFrames'

const LIMIT = 1000000000 // the problem's range: -1000000000 to 1000000000
type Language = keyof typeof SOLUTIONS

// Returns the number, or an error message to show.
function parseNumber(text: string): number | string {
  const trimmed = text.trim()
  if (!/^-?\d+$/.test(trimmed) || Math.abs(Number(trimmed)) > LIMIT) return `Enter one whole number from -${LIMIT} to ${LIMIT}.`
  return Number(trimmed) || 0 // turns -0 into 0
}

const boxClass = 'flex min-w-0 flex-col rounded border border-line bg-surface p-3'

function Variables({ frame }: { frame: WarmupFrame }) {
  const rows: [string, string | null][] = [
    ['text', frame.text === null ? null : `"${frame.text}"`],
    ['n', frame.n === null ? null : String(frame.n)],
    ['answer', frame.answer === null ? null : String(frame.answer)],
  ]
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-line pt-2 font-mono text-xs">
      {rows.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted">{name}</dt>
          <dd className={value === null ? 'text-muted' : 'text-ink'}>{value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

// The read, compute, print cycle of "Double the number", with the grader on both sides.
export default function WarmupVisual() {
  const id = useId()
  const [n, setN] = useState(21)
  const [prompt, setPrompt] = useState(false)
  const [language, setLanguage] = useState<Language>('python')
  const [customText, setCustomText] = useState('21')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => warmupFrames(n, prompt), [n, prompt])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const lines = SOLUTIONS[language].lines.filter(([key]) => prompt || key !== 'prompt')
  const inputRead = current.text !== null

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseNumber(customText)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    setInputError('')
    setN(parsed)
    goTo(0)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <label htmlFor={`${id}-language`} className="text-sm font-medium">
            Language
          </label>
          <select
            id={`${id}-language`}
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="ml-2 rounded border border-field bg-surface px-2 py-1 text-sm hover:border-muted"
          >
            {Object.entries(SOLUTIONS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_3fr_1fr]">
        <div className={boxClass}>
          <p className="text-sm font-medium">Input (standard input)</p>
          <p
            className={`mt-2 rounded border-2 px-2 py-1 font-mono text-sm break-all motion-safe:transition-colors motion-safe:duration-300 ${
              inputRead ? 'border-line bg-paper text-muted' : 'border-warn bg-surface text-ink'
            }`}
          >
            {current.input}
          </p>
          <p className="mt-1 text-xs text-muted">{inputRead ? 'Read by your program.' : 'Waiting to be read.'}</p>
        </div>

        <div className={boxClass}>
          <p className="text-sm font-medium">Your program ({SOLUTIONS[language].label})</p>
          <pre tabIndex={0} className="mt-2 overflow-x-auto rounded bg-paper py-1 font-mono text-xs leading-5">
            {lines.map(([key, text], index) => (
              <code
                key={index}
                className={`block px-2 whitespace-pre motion-safe:transition-colors motion-safe:duration-300 ${
                  key !== '' && key === current.line ? 'bg-warn text-inverse' : ''
                }`}
              >
                {text || ' '}
              </code>
            ))}
          </pre>
          <Variables frame={current} />
        </div>

        <div className={boxClass}>
          <p className="text-sm font-medium">Output (standard output)</p>
          <div className="mt-2 min-h-8 rounded border border-line px-2 py-1 font-mono text-sm break-all">
            {current.output.length === 0 && <span className="text-muted">nothing yet</span>}
            {current.output.map((line, index) => (
              <span key={index} className="block">
                {line}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Expected: {2 * n}</p>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-warn bg-warn" aria-hidden="true" />
          Line running in this step
        </li>
      </ul>

      {current.verdict && (
        <p className={`mt-3 inline-block rounded border border-line bg-surface px-3 py-2 font-semibold ${current.passed ? 'text-pass' : 'text-fail'}`}>
          {current.verdict}
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
        <form onSubmit={handleCustom} noValidate>
          <label htmlFor={`${id}-number`} className="block text-sm font-medium">
            Input number
          </label>
          <div className="mt-1 flex max-w-sm gap-2">
            <input
              id={`${id}-number`}
              type="text"
              autoComplete="off"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder="e.g. 21"
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-number-hint${inputError ? ` ${id}-number-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use this
            </button>
          </div>
          <p id={`${id}-number-hint`} className="mt-1 text-xs text-muted">
            A whole number from -{LIMIT} to {LIMIT}, as in the problem. The answer, 2 * n, still fits in a 32-bit int.
          </p>
          {inputError && (
            <p id={`${id}-number-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
            </p>
          )}
        </form>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={prompt}
            onChange={(event) => {
              setPrompt(event.target.checked)
              goTo(0)
            }}
            className="mt-0.5 size-4"
          />
          <span>Also print a prompt like "Enter a number:"</span>
        </label>
      </div>
    </div>
  )
}
