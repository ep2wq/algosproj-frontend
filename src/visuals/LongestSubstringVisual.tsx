import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import type { T } from './i18n'
import { longestSubstringFrames, type WindowFrame } from './longestSubstringFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

// The problem allows up to 1000 letters; 16 is what fits in the diagram.
const MAX_LETTERS = 16

// The lesson's examples, including the two where left must not move back (abba, tmmzuxt).
const SAMPLES = ['abcabcbb', 'abba', 'tmmzuxt', 'pwwkew', 'dvdf', 'bbbbb']

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// Sometimes a lesson example; otherwise random letters from a small alphabet, so letters repeat.
function randomExample(current?: string) {
  if (Math.random() < 0.3) {
    const choices = SAMPLES.filter((sample) => sample !== current)
    return choices[randomInt(0, choices.length - 1)]
  }
  const alphabet = 'abcdefgh'.slice(0, randomInt(4, 7))
  return Array.from({ length: randomInt(7, 12) }, () => alphabet[randomInt(0, alphabet.length - 1)]).join('')
}

function parseInput(text: string, t: T): string | { message: string } {
  const s = text.trim()
  if (!/^[a-z]*$/.test(s)) return { message: t('longestSubstring.invalid') }
  if (s.length > MAX_LETTERS) return { message: t('longestSubstring.tooLong', { count: MAX_LETTERS }) }
  return s
}

function inBest(frame: WindowFrame, index: number) {
  return frame.output !== null && index >= frame.bestStart && index < frame.bestStart + frame.best
}

function inWindow(frame: WindowFrame, index: number) {
  return frame.right !== null && index >= frame.left && index <= frame.right
}

function cellStyle(frame: WindowFrame, index: number) {
  if (inBest(frame, index)) return 'border-pass bg-pass text-inverse'
  if (frame.right === index) return 'border-warn bg-warn text-inverse'
  if (frame.earlier === index) return 'border-dashed border-warn bg-surface text-ink'
  if (inWindow(frame, index)) return 'border-accent bg-accent-soft text-ink'
  return 'border-muted bg-surface text-ink'
}

function pointerNames(frame: WindowFrame, index: number) {
  const names = []
  if (frame.right !== null && frame.left === index) names.push('left')
  if (frame.right === index) names.push('right')
  return names
}

function stringLabel(frame: WindowFrame, t: T) {
  if (frame.s === '') return t('longestSubstring.stringEmpty')
  const letters = [...frame.s].join(' ')
  if (frame.output !== null) return t('longestSubstring.stringBest', { letters, from: frame.bestStart, to: frame.bestStart + frame.best - 1 })
  if (frame.right === null) return t('longestSubstring.stringStart', { letters, left: frame.left })
  return t('longestSubstring.stringWindow', { letters, left: frame.left, right: frame.right, window: frame.s.slice(frame.left, frame.right + 1) })
}

function mapLabel(frame: WindowFrame, t: T) {
  if (frame.last.length === 0) return t('longestSubstring.mapEmpty')
  const entries = frame.last.map((entry) => t('longestSubstring.mapEntry', { letter: entry.letter, index: entry.index })).join(t('common.listSeparator'))
  return t('longestSubstring.mapLabel', { entries })
}

// Longest substring without a repeated letter: a sliding window and a last-seen map.
export default function LongestSubstringVisual() {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [text, setText] = useState(() => randomExample())
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => longestSubstringFrames(text, t), [text, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const updated = current.right !== null ? current.s[current.right] : null

  function restart(next: string) {
    setText(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(customText, t)
    if (typeof parsed !== 'string') {
      setInputError(parsed.message)
      return
    }
    setInputError('')
    restart(parsed)
  }

  const describedBy = `${id}-hint${inputError ? ` ${id}-error` : ''}`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['left', current.left],
          ['right', current.right ?? '-'],
          ['best', current.best],
        ].map(([name, value]) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
            <span className="font-mono text-sm text-muted">{name}</span>
            <span dir="ltr" className="text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={t('longestSubstring.lettersRegion')}
        dir="ltr"
        className="mt-3 overflow-x-auto rounded border border-line bg-surface p-3"
      >
        <div role="img" aria-label={stringLabel(current, t)} className="w-max">
          {current.s === '' ? (
            <p className="text-sm text-muted">{t('longestSubstring.emptyLine')}</p>
          ) : (
            <div className="flex gap-1">
              {[...current.s].map((letter, index) => {
                const names = pointerNames(current, index)
                return (
                  <div key={index} className="flex w-9 flex-col items-center">
                    <span className="h-4 text-xs leading-4 font-semibold text-ink">{names[0] ?? ''}</span>
                    <span className="h-4 text-xs leading-4 font-semibold text-ink">{names[1] ?? ''}</span>
                    <span
                      className={`mt-0.5 flex size-9 items-center justify-center rounded border-2 font-mono text-sm font-medium motion-safe:transition-colors motion-safe:duration-300 ${cellStyle(current, index)}`}
                    >
                      {letter}
                    </span>
                    <span className="mt-0.5 text-xs text-muted tabular-nums">{index}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm font-medium">{t('longestSubstring.lastSeen')}</p>
      <div
        tabIndex={0}
        role="region"
        aria-label={t('longestSubstring.mapRegion')}
        dir="ltr"
        className="mt-1 overflow-x-auto rounded border border-line bg-surface"
      >
        <table aria-label={mapLabel(current, t)} className="border-collapse text-sm tabular-nums">
          <tbody>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1 text-start text-xs font-medium text-muted">
                {t('longestSubstring.letter')}
              </th>
              {current.last.length === 0 && <td className="px-2 py-1 text-muted">{t('longestSubstring.tableEmpty')}</td>}
              {current.last.map((entry) => (
                <th
                  key={entry.letter}
                  scope="col"
                  className={`min-w-9 px-2 py-1 text-center font-mono font-semibold motion-safe:transition-colors motion-safe:duration-300 ${updated === entry.letter ? 'bg-warn text-inverse' : ''}`}
                >
                  {entry.letter}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="row" className="px-2 py-1 text-start text-xs font-medium text-muted">
                {t('longestSubstring.position')}
              </th>
              {current.last.length === 0 && <td className="px-2 py-1 text-muted">-</td>}
              {current.last.map((entry) => (
                <td
                  key={entry.letter}
                  className={`min-w-9 px-2 py-1 text-center motion-safe:transition-colors motion-safe:duration-300 ${updated === entry.letter ? 'bg-warn text-inverse' : ''}`}
                >
                  {entry.index}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-warn bg-warn" aria-hidden="true" />
          <TextWithCode text={t('longestSubstring.legendRight')} />
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-dashed border-warn bg-surface" aria-hidden="true" />
          {t('longestSubstring.legendEarlier')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-accent bg-accent-soft" aria-hidden="true" />
          <TextWithCode text={t('longestSubstring.legendWindow')} />
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
          <TextWithCode text={t('longestSubstring.legendBest')} />
        </li>
        <li>{t('common.smallPositions')}</li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')} <span className="font-mono">{current.output}</span>
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomExample(text))} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-input`} className="block text-sm font-medium">
                {t('longestSubstring.ownWord')}
              </label>
              <input
                id={`${id}-input`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder={t('longestSubstring.placeholder')}
                aria-invalid={Boolean(inputError)}
                aria-describedby={describedBy}
                className={`mt-1 block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${inputError ? 'border-fail' : 'border-field hover:border-muted'}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThis')}
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t('longestSubstring.hint', { count: MAX_LETTERS })} />
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
