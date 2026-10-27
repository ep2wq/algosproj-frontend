import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { palindromeFrames, reverseFrames, type PointerFrame, type PointerMode } from './twoPointerFrames'
import { usePlayback } from './usePlayback'
import { useCentreCells, useScrollCue } from './useScrollCue'

const MAX_LENGTH = 12

// The allowed characters follow each problem's input rules. The texts are under
// twoPointer.<mode> (labels, hint, error) and twoPointer.legend.<key>.
const MODES = {
  reverse: {
    frames: reverseFrames,
    samples: ['hello', 'abc def', 'racecar', 'stack', 'two sum', 'data 2024', 'level', 'Binary'],
    pattern: /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/,
    legend: [
      { key: 'swapped', style: 'border-accent bg-accent' },
      { key: 'settled', style: 'border-pass bg-pass' },
    ],
  },
  palindrome: {
    frames: palindromeFrames,
    samples: ['level', 'racecar', 'abba', 'noon', 'kayak', 'refer', 'madam', 'hello', 'abca', 'banana', 'abcdba', 'stack'],
    pattern: /^[a-z]+$/,
    legend: [
      { key: 'compared', style: 'border-warn bg-warn' },
      { key: 'matched', style: 'border-pass bg-pass' },
      { key: 'mismatch', style: 'border-fail bg-fail' },
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
  const { t } = useTranslation('visuals')
  const id = useId()
  const config = MODES[mode]
  const [text, setText] = useState(() => randomSample(config.samples))
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => config.frames(text, t), [config, text, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  // Centre the span between the pointers when it fits, else the left one; with no pointers, the whole text.
  useCentreCells(scrollRef, current.left ?? 0, current.right ?? current.chars.length - 1, text)

  function restart(nextText: string) {
    setText(nextText)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (customText.length === 0) return setInputError(t('twoPointer.atLeastOne'))
    if (customText.length > MAX_LENGTH) return setInputError(t('stack.tooManyChars', { count: MAX_LENGTH }))
    if (!config.pattern.test(customText)) return setInputError(t(`twoPointer.${mode}.patternError`))
    setInputError('')
    restart(customText)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={t('twoPointer.region')}
        dir="ltr"
        ref={scrollRef}
        className={`mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
      >
        <div
          role="img"
          aria-label={t('twoPointer.label', { text: current.chars.join('') })}
          className="flex w-max gap-x-1.5"
        >
          {current.chars.map((char, index) => (
            <div key={index} data-index={index} className="flex w-10 flex-col items-center">
              <span className="h-4 text-xs font-semibold text-ink">{pointerLabels(current, index)}</span>
              <span
                className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 font-mono font-medium motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${cellStyle(mode, current, index)}`}
              >
                {char === ' ' ? '␣' : char}
              </span>
              <span className="mt-0.5 font-mono text-xs text-muted tabular-nums">{index}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {config.legend.map(({ key, style }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm border ${style}`} aria-hidden="true" />
            {t(`twoPointer.legend.${key}`)}
          </li>
        ))}
        <li>
          <TextWithCode text={mode === 'reverse' ? t('twoPointer.pointersSpace') : t('twoPointer.pointers')} />
        </li>
      </ul>

      {current.result && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          <TextWithCode text={current.result} />
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomSample(config.samples, text))} className={buttonClass}>
          {t(`twoPointer.${mode}.randomLabel`)}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-text`} className="block text-sm font-medium">
            {t(`twoPointer.${mode}.inputLabel`)}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id={`${id}-text`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={t(`twoPointer.${mode}.placeholder`)}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-text-hint${inputError ? ` ${id}-text-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThis')}
            </button>
          </div>
          <p id={`${id}-text-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t(`twoPointer.${mode}.hint`, { max: MAX_LENGTH })} />
          </p>
          {inputError && (
            <p id={`${id}-text-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
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
