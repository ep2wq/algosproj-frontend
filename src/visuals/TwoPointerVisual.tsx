import { useId, useMemo, useState, type FormEvent } from 'react'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { palindromeFrames, reverseFrames, type PointerFrame, type PointerMode } from './twoPointerFrames'
import { usePlayback } from './usePlayback'

const MAX_LENGTH = 12

// The allowed characters follow each problem's input rules.
const MODES = {
  reverse: {
    frames: reverseFrames,
    samples: ['hello', 'abc def', 'racecar', 'stack', 'two sum', 'data 2024', 'level', 'Binary'],
    inputLabel: 'Your own text',
    randomLabel: 'New random text',
    placeholder: 'e.g. abc def',
    hint: `1 to ${MAX_LENGTH} characters: letters, digits and single spaces, with no space at the start or end (the same rule as the problem).`,
    pattern: /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/,
    patternError: 'Use only letters, digits and single spaces, with no space at the start or end.',
    legend: [
      { label: 'Swapped in this step', style: 'border-accent bg-accent' },
      { label: 'In final place', style: 'border-pass bg-pass' },
    ],
  },
  palindrome: {
    frames: palindromeFrames,
    samples: ['level', 'racecar', 'abba', 'noon', 'kayak', 'refer', 'madam', 'hello', 'abca', 'banana', 'abcdba', 'stack'],
    inputLabel: 'Your own word',
    randomLabel: 'New random word',
    placeholder: 'e.g. racecar',
    hint: `1 to ${MAX_LENGTH} lowercase letters a to z, no spaces or capitals (the same rule as the problem).`,
    pattern: /^[a-z]+$/,
    patternError: 'Use only lowercase letters a to z, with no spaces.',
    legend: [
      { label: 'Being compared', style: 'border-warn bg-warn' },
      { label: 'Matched', style: 'border-pass bg-pass' },
      { label: 'Mismatch', style: 'border-fail bg-fail' },
    ],
  },
}

function randomSample(samples: string[], current?: string) {
  const choices = samples.filter((sample) => sample !== current)
  return choices[Math.floor(Math.random() * choices.length)]
}

function cellStyle(mode: PointerMode, frame: PointerFrame, index: number) {
  if (frame.active.includes(index)) {
    if (mode === 'reverse') return 'border-accent bg-accent text-inverse'
    return frame.mismatch ? 'border-fail bg-fail text-inverse' : 'border-warn bg-warn text-inverse'
  }
  if (frame.settled.includes(index)) return 'border-pass bg-pass text-inverse'
  return 'border-muted bg-surface text-ink'
}

function pointerLabels(frame: PointerFrame, index: number) {
  const labels = []
  if (frame.left === index) labels.push('L')
  if (frame.right === index) labels.push('R')
  return labels.join(' ')
}

// Two pointers moving inward from both ends: reversing text, or checking a palindrome.
export default function TwoPointerVisual({ mode }: { mode: PointerMode }) {
  const id = useId()
  const config = MODES[mode]
  const [text, setText] = useState(() => randomSample(config.samples))
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => config.frames(text), [config, text])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(nextText: string) {
    setText(nextText)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (customText.length === 0) return setInputError('Enter at least one character.')
    if (customText.length > MAX_LENGTH) return setInputError(`Use at most ${MAX_LENGTH} characters.`)
    if (!config.pattern.test(customText)) return setInputError(config.patternError)
    setInputError('')
    restart(customText)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div
        role="img"
        aria-label={`Text: "${current.chars.join('')}".`}
        className="mt-4 flex flex-wrap gap-x-1.5 gap-y-3 rounded border border-line bg-surface p-3"
      >
        {current.chars.map((char, index) => (
          <div key={index} className="flex w-10 flex-col items-center">
            <span className="h-4 text-xs font-semibold text-ink">{pointerLabels(current, index)}</span>
            <span
              className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 font-mono font-medium motion-safe:transition-colors motion-safe:duration-300 ${cellStyle(mode, current, index)}`}
            >
              {char === ' ' ? '␣' : char}
            </span>
            <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
          </div>
        ))}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {config.legend.map(({ label, style }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm border ${style}`} aria-hidden="true" />
            {label}
          </li>
        ))}
        <li>L, R: left and right pointers. Small numbers: indices.{mode === 'reverse' && ' ␣ is a space.'}</li>
      </ul>

      {current.result && (
        <p className="mt-3 inline-block rounded border border-line bg-surface px-3 py-2 font-semibold">{current.result}</p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomSample(config.samples, text))} className={buttonClass}>
          {config.randomLabel}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-text`} className="block text-sm font-medium">
            {config.inputLabel}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-text`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={config.placeholder}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-text-hint${inputError ? ` ${id}-text-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use this
            </button>
          </div>
          <p id={`${id}-text-hint`} className="mt-1 text-xs text-muted">
            {config.hint}
          </p>
          {inputError && (
            <p id={`${id}-text-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export function ReverseVisual() {
  return <TwoPointerVisual mode="reverse" />
}

export function PalindromeVisual() {
  return <TwoPointerVisual mode="palindrome" />
}
