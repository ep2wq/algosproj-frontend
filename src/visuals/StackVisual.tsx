import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import type { T } from './i18n'
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
function randomPostfix(t: T) {
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
    if (postfixError(tokens, t) === null) return tokens.join(' ')
  }
}

function randomNumbers() {
  return Array.from({ length: 8 }, () => randomInt(1, 20)).join(' ')
}

type Parsed = { frames: StackFrame[] } | { error: string }

function parseBrackets(text: string, t: T): Parsed {
  if (text.length > 14) return { error: t('stack.tooManyChars', { count: 14 }) }
  if (!/^[()[\]{}]*$/.test(text)) return { error: t('stack.onlyBrackets') }
  return { frames: bracketFrames(text, t) }
}

function parsePostfix(text: string, t: T): Parsed {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { error: t('stack.atLeastOneToken') }
  if (tokens.length > 9) return { error: t('stack.tooManyTokens', { count: 9 }) }
  // The problem's token range: numbers are 0 to 1000. Negative values only appear as results.
  const isNumber = (token: string) => /^\d+$/.test(token) && Number(token) <= 1000
  if (tokens.some((token) => !isNumber(token) && !['+', '-', '*', '/'].includes(token))) {
    return { error: t('stack.invalidTokens') }
  }
  const error = postfixError(tokens, t)
  return error ? { error } : { frames: postfixFrames(tokens.map((token) => (isNumber(token) ? String(Number(token)) : token)), t) }
}

function parseNumbers(text: string, t: T): Parsed {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return { error: t('common.atLeastOneNumber') }
  if (parts.length > 12) return { error: t('common.atMostNumbers', { count: 12 }) }
  if (parts.some((part) => !/^-?\d+$/.test(part) || Number(part) < -99 || Number(part) > 99)) {
    return { error: t('arrayScan.invalid') }
  }
  return { frames: nextGreaterFrames(parts.map(Number), t) }
}

// Each mode's rules follow the graded problem; the hint (stack.<mode>.hint) repeats them
// under the input box.
const MODES = {
  brackets: { parse: parseBrackets, random: randomBrackets },
  postfix: { parse: parsePostfix, random: randomPostfix },
  'next-greater': { parse: parseNumbers, random: randomNumbers },
}

function itemStyle(frame: StackFrame, index: number) {
  if (frame.current === index) return 'border-warn bg-warn text-inverse'
  const read = frame.current === null ? frame.result !== null : index < frame.current
  return read ? 'border-line bg-paper text-muted' : 'border-muted bg-surface text-ink'
}

function stackLabel(frame: StackFrame, t: T) {
  if (frame.stack.length === 0) return t('stack.stackEmptyLabel')
  const top = [...frame.stack].reverse().map((item) => (item.index === undefined ? item.text : t('stack.itemAtIndex', { text: item.text, index: item.index })))
  return t('stack.stackLabel', { items: top.join(t('common.listSeparator')) })
}

// One stack, three algorithms: balanced brackets, postfix evaluation, next greater element.
export default function StackVisual({ mode }: { mode: StackMode }) {
  const { t } = useTranslation('visuals')
  const id = useId()
  const config = MODES[mode]
  const [source, setSource] = useState(() => config.random(t))
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  // The random examples are always valid, so parsing them always gives frames.
  const frames = useMemo(() => {
    const parsed = config.parse(source, t)
    return 'frames' in parsed ? parsed.frames : []
  }, [config, source, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(nextSource: string) {
    setSource(nextSource)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = config.parse(customText, t)
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
          aria-label={t(`stack.${mode}.itemsLabel`, { items: current.items.join(' ') || t('stack.none') })}
          dir="ltr"
          className="flex min-w-0 flex-1 flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-surface p-3"
        >
          {current.items.length === 0 && <p className="text-sm text-muted">{t('stack.noCharacters')}</p>}
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
                      ? 'border-pass bg-pass text-inverse'
                      : current.answers![index] === null
                        ? 'border-dashed border-line text-muted'
                        : 'border-line bg-surface text-ink'
                  }`}
                >
                  {current.answers![index] ?? '?'}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="sm:w-32">
          <p className="text-sm font-medium">
            <TextWithCode text={t('stack.stackTitle')} />
          </p>
          <div role="img" aria-label={stackLabel(current, t)} dir="ltr" className="mt-1 flex flex-col gap-1">
            {current.stack.length === 0 ? (
              <span className="flex h-10 items-center justify-center rounded border-2 border-dashed border-line text-sm text-muted">
                {t('stack.empty')}
              </span>
            ) : (
              [...current.stack].reverse().map((item, position) => (
                <div key={current.stack.length - 1 - position}>
                  {position === 0 && <span className="block text-xs font-semibold text-ink">top</span>}
                  <span className="flex min-h-10 flex-col items-center justify-center rounded border-2 border-accent bg-accent-soft px-2 py-1 font-mono font-medium">
                    {item.text}
                    {item.index !== undefined && <span className="font-sans text-xs font-normal text-muted">{t('stack.indexChip', { index: item.index })}</span>}
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
          {t('stack.legendReading')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-muted/40 bg-paper" aria-hidden="true" />
          {t('stack.legendRead')}
        </li>
        {showAnswers && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
            {t('stack.legendAnswer')}
          </li>
        )}
        <li>{t('common.smallPositions')}</li>
      </ul>

      {current.result && (
        <p className={`mt-3 inline-block rounded border border-line bg-surface px-3 py-2 font-semibold ${current.failed ? 'text-fail' : 'text-ink'}`}>
          <TextWithCode text={current.result} />
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(config.random(t))} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-input`} className="block text-sm font-medium">
            {t(`stack.${mode}.inputLabel`)}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-input`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={t(`stack.${mode}.placeholder`)}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-input-hint${inputError ? ` ${id}-input-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThis')}
            </button>
          </div>
          <p id={`${id}-input-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t(`stack.${mode}.hint`)} />
          </p>
          {inputError && (
            <p id={`${id}-input-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
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
