import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { anagramFrames, type AnagramFrame } from './anagramFrames'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import { useScrollCue } from './useScrollCue'

// The problem allows up to 1000 letters per word; 12 is what fits on screen.
const MAX_LETTERS = 12

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle(word: string) {
  const letters = [...word]
  for (let i = letters.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    const swap = letters[i]
    letters[i] = letters[j]
    letters[j] = swap
  }
  return letters.join('')
}

// Mostly anagrams; otherwise one letter swapped for another (a count goes below 0) or a
// different length (stops at the first step).
function randomExample() {
  const alphabet = shuffle('abcdeilmnorst').slice(0, randomInt(3, 5))
  const s = Array.from({ length: randomInt(4, 8) }, () => alphabet[randomInt(0, alphabet.length - 1)]).join('')
  const roll = Math.random()
  if (roll < 0.55) return { s, t: shuffle(s) }
  if (roll < 0.85) {
    const t = shuffle(s)
    const i = randomInt(0, t.length - 1)
    const other = 'abcdeilmnorst'.replace(t[i], '')
    return { s, t: t.slice(0, i) + other[randomInt(0, other.length - 1)] + t.slice(i + 1) }
  }
  return { s, t: shuffle(s).slice(1) }
}

type Field = 's' | 't'

function parseWord(text: string, name: string, t: T): string | { message: string } {
  const word = text.trim()
  if (!/^[a-z]*$/.test(word)) return { message: t('anagram.invalidLetters', { word: name }) }
  if (word.length > MAX_LETTERS) return { message: t('anagram.tooLong', { word: name, count: MAX_LETTERS }) }
  return word
}

function letterStyle(frame: AnagramFrame, word: Field, index: number) {
  const active = frame.pass === word && frame.index === index
  if (active) return frame.below !== null ? 'border-fail bg-fail text-inverse' : 'border-warn bg-warn text-inverse'
  const read = frame.pass === 'done' || (frame.pass === 't' && (word === 's' || index < frame.index!)) || (frame.pass === 's' && word === 's' && index < frame.index!)
  if (read) return 'border-line bg-paper text-muted'
  return 'border-muted bg-surface text-ink'
}

function countStyle(frame: AnagramFrame, letter: string) {
  if (frame.below === letter) return 'bg-fail text-inverse'
  if (frame.changed === letter) return 'bg-warn text-inverse'
  if (frame.pass === 'done') return 'bg-pass text-inverse'
  return ''
}

function wordsLabel(frame: AnagramFrame, t: T) {
  const spell = (word: string) => (word === '' ? t('anagram.spellEmpty') : [...word].join(' '))
  if (frame.pass === 's' || frame.pass === 't') return t('anagram.wordsLabelReading', { s: spell(frame.s), t: spell(frame.t), index: frame.index, word: frame.pass })
  return t('anagram.wordsLabel', { s: spell(frame.s), t: spell(frame.t) })
}

function countsLabel(frame: AnagramFrame, t: T) {
  if (frame.counts.length === 0) return t('anagram.countsEmpty')
  return t('anagram.countsLabel', { entries: frame.counts.map((entry) => `${entry.letter} ${entry.count}`).join(t('common.listSeparator')) })
}

function WordRow({ frame, word }: { frame: AnagramFrame; word: Field }) {
  const { t } = useTranslation('visuals')
  const text = frame[word]
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 w-4 shrink-0 font-mono text-sm font-semibold">{word}</span>
      {text === '' ? (
        <span className="mt-1.5 text-sm text-muted">{t('anagram.empty')}</span>
      ) : (
        <div className="flex gap-1">
          {[...text].map((letter, index) => (
            <div key={index} className="flex flex-col items-center">
              <span
                className={`flex size-8 items-center justify-center rounded border-2 font-mono text-sm font-medium motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${letterStyle(frame, word, index)}`}
              >
                {letter}
              </span>
              <span className="mt-0.5 font-mono text-xs text-muted tabular-nums">{index}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Valid anagram: compare the lengths, count the letters of s, then take away the letters of t.
export default function AnagramVisual() {
  const { t: tr } = useTranslation('visuals')
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const [scrollRef2, scrollMore2] = useScrollCue<HTMLDivElement>()
  const id = useId()
  const [example, setExample] = useState(randomExample)
  const [sText, setSText] = useState('')
  const [tText, setTText] = useState('')
  const [inputError, setInputError] = useState<{ field: Field; message: string } | null>(null)

  const frames = useMemo(() => anagramFrames(example.s, example.t, tr), [example, tr])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(next: { s: string; t: string }) {
    setExample(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const s = parseWord(sText, 's', tr)
    if (typeof s !== 'string') {
      setInputError({ field: 's', message: s.message })
      return
    }
    const t = parseWord(tText, 't', tr)
    if (typeof t !== 'string') {
      setInputError({ field: 't', message: t.message })
      return
    }
    setInputError(null)
    restart({ s, t })
  }

  const describedBy = (field: Field) => `${id}-hint${inputError?.field === field ? ` ${id}-error` : ''}`
  const inputClass = (field: Field) =>
    `block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-field hover:border-muted'
    }`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={tr('anagram.wordsRegion')}
        dir="ltr"
        ref={scrollRef}
        className={`mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
      >
        <div role="img" aria-label={wordsLabel(current, tr)} className="flex w-max flex-col gap-2">
          <WordRow frame={current} word="s" />
          <WordRow frame={current} word="t" />
        </div>
      </div>

      <p className="mt-3 text-sm font-medium">{tr('anagram.counts')}</p>
      <div
        tabIndex={0}
        role="region"
        aria-label={tr('anagram.countsRegion')}
        dir="ltr"
        ref={scrollRef2}
        className={`mt-1 overflow-x-auto rounded-lg border border-line bg-surface${scrollMore2 ? ' scroll-fade' : ''}`}
      >
        <table aria-label={countsLabel(current, tr)} className="border-collapse text-sm tabular-nums">
          <tbody>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1 text-start text-xs font-medium text-muted">
                {tr('anagram.letter')}
              </th>
              {current.counts.length === 0 && <td className="px-2 py-1 text-muted">{tr('anagram.tableEmpty')}</td>}
              {current.counts.map((entry) => (
                <th key={entry.letter} scope="col" className={`min-w-9 px-2 py-1 text-center font-mono font-semibold motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${countStyle(current, entry.letter)}`}>
                  {entry.letter}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="row" className="px-2 py-1 text-start text-xs font-medium text-muted">
                {tr('anagram.count')}
              </th>
              {current.counts.length === 0 && <td className="px-2 py-1 text-muted">-</td>}
              {current.counts.map((entry) => (
                <td key={entry.letter} className={`min-w-9 px-2 py-1 text-center motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${countStyle(current, entry.letter)}`}>
                  {entry.count}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-warn" aria-hidden="true" />
          {tr('anagram.legendRead')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-fail bg-fail" aria-hidden="true" />
          <TextWithCode text={tr('anagram.legendBelow')} />
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-pass bg-pass" aria-hidden="true" />
          <TextWithCode text={tr('anagram.legendZero')} />
        </li>
        <li>{tr('common.smallPositions')}</li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          {tr('common.output')} <span className="font-mono">{current.output}</span>
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomExample())} className={buttonClass}>
          {tr('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-28">
              <label htmlFor={`${id}-s`} className="block text-sm font-medium">
                <TextWithCode text={tr('anagram.ownS')} />
              </label>
              <input
                id={`${id}-s`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={sText}
                onChange={(event) => setSText(event.target.value)}
                dir="ltr"
                placeholder={tr('anagram.placeholderS')}
                aria-invalid={inputError?.field === 's'}
                aria-describedby={describedBy('s')}
                className={`mt-1 ${inputClass('s')}`}
              />
            </div>
            <div className="min-w-0 flex-1 basis-28">
              <label htmlFor={`${id}-t`} className="block text-sm font-medium">
                <TextWithCode text={tr('anagram.ownT')} />
              </label>
              <input
                id={`${id}-t`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={tText}
                onChange={(event) => setTText(event.target.value)}
                dir="ltr"
                placeholder={tr('anagram.placeholderT')}
                aria-invalid={inputError?.field === 't'}
                aria-describedby={describedBy('t')}
                className={`mt-1 ${inputClass('t')}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {tr('common.useThese')}
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={tr('anagram.hint', { count: MAX_LETTERS })} />
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError.message} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
