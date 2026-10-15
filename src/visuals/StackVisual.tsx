import { useId, useMemo, useState, type FormEvent } from 'react'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { bracketFrames, nextGreaterFrames, postfixError, postfixFrames, type StackFrame, type StackMode } from './stackFrames'
import { usePlayback } from './usePlayback'

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

const CLOSER_OF: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

// A balanced string of up to 12 characters; about half the time one character is changed,
// which usually leaves it unbalanced.
function randomBrackets() {
  let text = ''
  const open: string[] = []
  const pairs = randomInt(1, 6)
  for (let i = 0; i < pairs; i++) {
    const opener = '([{'[randomInt(0, 2)]
    text += opener
    open.push(opener)
    while (open.length > 0 && Math.random() < 0.5) text += CLOSER_OF[open.pop()!]
  }
  while (open.length > 0) text += CLOSER_OF[open.pop()!]
  if (Math.random() < 0.5) {
    const i = randomInt(0, text.length - 1)
    text = text.slice(0, i) + '()[]{}'[randomInt(0, 5)] + text.slice(i + 1)
  }
  return text
}

// A valid expression of 3, 5 or 7 tokens with small numbers.
function randomPostfix() {
  for (;;) {
    const numbers = randomInt(2, 4)
    const tokens: string[] = []
    let depth = 0
    let pushed = 0
    while (pushed < numbers || depth > 1) {
      if (pushed < numbers && (depth < 2 || Math.random() < 0.5)) {
        tokens.push(String(randomInt(1, 9)))
        depth++
        pushed++
      } else {
        tokens.push('+-*/'[randomInt(0, 3)])
        depth--
      }
    }
    if (postfixError(tokens) === null) return tokens.join(' ')
  }
}

function randomNumbers() {
  return Array.from({ length: 8 }, () => randomInt(1, 20)).join(' ')
}

type Parsed = { frames: StackFrame[] } | { error: string }

function parseBrackets(text: string): Parsed {
  if (text.length > 14) return { error: 'Use at most 14 characters.' }
  if (!/^[()[\]{}]*$/.test(text)) return { error: 'Use only the characters ( ) [ ] { }, with no spaces.' }
  return { frames: bracketFrames(text) }
}

function parsePostfix(text: string): Parsed {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { error: 'Enter at least one token.' }
  if (tokens.length > 9) return { error: 'Use at most 9 tokens.' }
  // The problem's token range: numbers are 0 to 1000. Negative values only appear as results.
  const isNumber = (t: string) => /^\d+$/.test(t) && Number(t) <= 1000
  if (tokens.some((t) => !isNumber(t) && !['+', '-', '*', '/'].includes(t))) {
    return { error: 'Use whole numbers from 0 to 1000 and the operators + - * /, separated by spaces.' }
  }
  const error = postfixError(tokens)
  return error ? { error } : { frames: postfixFrames(tokens.map((t) => (isNumber(t) ? String(Number(t)) : t))) }
}

function parseNumbers(text: string): Parsed {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return { error: 'Enter at least one number.' }
  if (parts.length > 12) return { error: 'Enter at most 12 numbers.' }
  if (parts.some((part) => !/^-?\d+$/.test(part) || Number(part) < -99 || Number(part) > 99)) {
    return { error: 'Use whole numbers from -99 to 99, separated by spaces or commas.' }
  }
  return { frames: nextGreaterFrames(parts.map(Number)) }
}

// Each mode's rules follow the graded problem; the hint repeats them under the input box.
const MODES = {
  brackets: {
    parse: parseBrackets,
    random: randomBrackets,
    inputLabel: 'Your own brackets',
    placeholder: 'e.g. ([]{})',
    hint: 'Up to 14 of the characters ( ) [ ] { }, as in the problem. Empty counts as balanced.',
    itemsLabel: 'Brackets',
  },
  postfix: {
    parse: parsePostfix,
    random: randomPostfix,
    inputLabel: 'Your own expression',
    placeholder: 'e.g. 3 4 + 2 *',
    hint: 'Up to 9 tokens separated by spaces: whole numbers from 0 to 1000 and + - * /. As in the problem, / truncates toward zero: 1 8 - 2 / gives -7 / 2 = -3.',
    itemsLabel: 'Tokens',
  },
  'next-greater': {
    parse: parseNumbers,
    random: randomNumbers,
    inputLabel: 'Your own numbers',
    placeholder: 'e.g. 4 5 2 25',
    hint: '1 to 12 whole numbers from -99 to 99. As in the problem, the next greater is the first strictly bigger number to the right, or -1 if there is none.',
    itemsLabel: 'Numbers',
  },
}

function itemStyle(frame: StackFrame, index: number) {
  if (frame.current === index) return 'border-warn bg-warn text-white'
  const read = frame.current === null ? frame.result !== null : index < frame.current
  return read ? 'border-line bg-paper text-muted' : 'border-muted bg-white text-ink'
}

function stackLabel(frame: StackFrame) {
  if (frame.stack.length === 0) return 'Stack: empty.'
  const top = [...frame.stack].reverse().map((item) => (item.index === undefined ? item.text : `${item.text} (index ${item.index})`))
  return `Stack, top first: ${top.join(', ')}.`
}

// One stack, three algorithms: balanced brackets, postfix evaluation, next greater element.
export default function StackVisual({ mode }: { mode: StackMode }) {
  const id = useId()
  const config = MODES[mode]
  const [source, setSource] = useState(config.random)
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  // The random examples are always valid, so parsing them always gives frames.
  const frames = useMemo(() => {
    const parsed = config.parse(source)
    return 'frames' in parsed ? parsed.frames : []
  }, [config, source])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(nextSource: string) {
    setSource(nextSource)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = config.parse(customText)
    if ('error' in parsed) {
      setInputError(parsed.error)
      return
    }
    setInputError('')
    restart(customText)
  }

  const showAnswers = current.answers !== null

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          role="img"
          aria-label={`${config.itemsLabel}: ${current.items.join(' ') || 'none'}.`}
          className="flex min-w-0 flex-1 flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-white p-3"
        >
          {current.items.length === 0 && <p className="text-sm text-muted">No characters.</p>}
          {current.items.map((item, index) => (
            <div key={index} className="flex min-w-10 flex-col items-center">
              <span className="h-4 text-xs font-semibold text-ink">{current.current === index ? 'i' : ''}</span>
              <span
                className={`mt-0.5 flex h-10 min-w-10 items-center justify-center rounded border-2 px-1 font-mono font-medium motion-safe:transition-colors motion-safe:duration-300 ${itemStyle(current, index)}`}
              >
                {item}
              </span>
              <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
              {showAnswers && (
                <span
                  className={`mt-1 flex h-8 w-10 items-center justify-center rounded border text-sm tabular-nums motion-safe:transition-colors motion-safe:duration-300 ${
                    current.filled.includes(index)
                      ? 'border-pass bg-pass text-white'
                      : current.answers![index] === null
                        ? 'border-dashed border-line text-muted'
                        : 'border-line bg-white text-ink'
                  }`}
                >
                  {current.answers![index] ?? '?'}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="sm:w-32">
          <p className="text-sm font-medium">Stack</p>
          <div role="img" aria-label={stackLabel(current)} className="mt-1 flex flex-col gap-1">
            {current.stack.length === 0 ? (
              <span className="flex h-10 items-center justify-center rounded border-2 border-dashed border-line text-sm text-muted">
                empty
              </span>
            ) : (
              [...current.stack].reverse().map((item, position) => (
                <div key={current.stack.length - 1 - position}>
                  {position === 0 && <span className="block text-xs font-semibold text-ink">top</span>}
                  <span className="flex min-h-10 flex-col items-center justify-center rounded border-2 border-accent bg-accent-soft px-2 py-1 font-mono font-medium">
                    {item.text}
                    {item.index !== undefined && <span className="font-sans text-xs font-normal text-muted">index {item.index}</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-warn bg-warn" aria-hidden="true" />
          Being read (marked i)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-muted/40 bg-paper" aria-hidden="true" />
          Already read
        </li>
        {showAnswers && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
            Answer found in this step (? = not known yet)
          </li>
        )}
        <li>Small numbers: positions.</li>
      </ul>

      {current.result && (
        <p className={`mt-3 inline-block rounded border border-line bg-white px-3 py-2 font-semibold ${current.failed ? 'text-fail' : 'text-ink'}`}>
          {current.result}
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(config.random())} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-input`} className="block text-sm font-medium">
            {config.inputLabel}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-input`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={config.placeholder}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-input-hint${inputError ? ` ${id}-input-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-white px-3 py-1.5 font-mono text-sm ${
                inputError ? 'border-fail' : 'border-line hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use this
            </button>
          </div>
          <p id={`${id}-input-hint`} className="mt-1 text-xs text-muted">
            {config.hint}
          </p>
          {inputError && (
            <p id={`${id}-input-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export function BracketsVisual() {
  return <StackVisual mode="brackets" />
}

export function PostfixVisual() {
  return <StackVisual mode="postfix" />
}

export function NextGreaterVisual() {
  return <StackVisual mode="next-greater" />
}
