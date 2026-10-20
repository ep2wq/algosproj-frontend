import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { binaryStringFrames, type BinaryFrame } from './binaryStringFrames'
import CallTreeDiagram, { CallTreeLegend, type CallMark } from './CallTreeDiagram'
import type { CallNode } from './callTree'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

// The problem allows 1 <= n <= 10; the visual stops at 4, so the tree (16 leaves) stays readable.
const MAX_N = 4

function randomN(not: number) {
  const choices = [2, 3, 3, 4].filter((n) => n !== not)
  return choices[Math.floor(Math.random() * choices.length)]
}

// Returns n, or an error message to show.
function parseN(text: string, t: T): number | string {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1 || Number(trimmed) > MAX_N) return t('binaryString.invalidN', { max: MAX_N })
  return Number(trimmed)
}

function markFor(frame: BinaryFrame) {
  const printed = new Set(frame.printed)
  const running = frame.stack[frame.stack.length - 1]
  return (id: number): CallMark => {
    if (printed.has(id)) return 'printed'
    if (id === running) return 'running'
    if (frame.stack.includes(id)) return 'open'
    return 'returned'
  }
}

function treeLabel(frame: BinaryFrame, tree: CallNode[], t: T) {
  const running = frame.stack.length === 0 ? t('callTree.runningNone') : tree[frame.stack[frame.stack.length - 1]].label
  const printed = frame.results.length === 0 ? t('callTree.nothing') : frame.results.join(', ')
  return t('callTree.treeLabel', { shown: frame.shown, total: tree.length, running, printed })
}

// The recursion for "Binary strings": the call tree grows one call at a time, with choose,
// explore and undo, and the printed strings collect in order.
export default function BinaryStringsVisual() {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [n, setN] = useState(3)
  const [nText, setNText] = useState('3')
  const [inputError, setInputError] = useState('')

  const { tree, frames } = useMemo(() => binaryStringFrames(n, t), [n, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(next: number) {
    setN(next)
    setNText(String(next))
    setInputError('')
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseN(nText, t)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    restart(parsed)
  }

  const vars = [
    { name: 'cur', value: `"${current.cur}"` },
    { name: t('binaryString.deciding'), value: current.position === null ? '-' : t('binaryString.positionOf', { position: current.position, n }) },
    { name: t('binaryString.depth'), value: current.depth === null ? '-' : String(current.depth) },
  ]
  const callStack = current.stack.map((call) => tree[call].label)

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {vars.map(({ name, value }) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
            <span className="text-sm text-muted">{name}</span>
            <span dir="ltr" className="font-mono text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <p className="mt-3 text-sm">
        <span className="font-medium">
          <TextWithCode text={t('callTree.callStack')} />
        </span>{' '}
        <span className="text-muted">{t('callTree.firstOnLeft')}</span>:{' '}
        <span dir="ltr" className="font-mono break-all">
          {callStack.length === 0 ? t('callTree.empty') : callStack.join(' → ')}
        </span>
      </p>

      <CallTreeDiagram nodes={tree} shown={current.shown} markOf={markFor(current)} label={treeLabel(current, tree, t)} />
      <CallTreeLegend />
      <p className="mt-1 text-xs text-muted">
        <TextWithCode text={t('binaryString.noPrune', { leaves: 2 ** n })} />
      </p>

      <p className="mt-3 text-sm font-medium">
        {t('callTree.resultsSoFar', { done: current.results.length, total: 2 ** n })}
      </p>
      <ol
        aria-label={t('callTree.resultsLabel', { list: current.results.length === 0 ? t('callTree.none') : current.results.join(', ') })}
        dir="ltr"
        className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1.5">
        {current.results.length === 0 && <li className="px-1 text-sm text-muted">{t('callTree.noneYet')}</li>}
        {current.results.map((result, index) => {
          const isNew = current.kind === 'print' && index === current.results.length - 1
          return (
            <li key={result} className={`rounded border px-1.5 py-0.5 font-mono text-sm ${isNew ? 'border-pass bg-pass text-inverse' : 'border-muted bg-surface'}`}>
              {result}
              {isNew && <span className="ms-1 font-sans text-xs">{t('callTree.new')}</span>}
            </li>
          )
        })}
      </ol>

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomN(n))} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-n`} className="block text-sm font-medium">
            <TextWithCode text={t('binaryString.ownN')} />
          </label>
          <div className="mt-1 flex max-w-xs gap-2">
            <input
              id={`${id}-n`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              value={nText}
              onChange={(event) => setNText(event.target.value)}
              placeholder={t('binaryString.placeholder')}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-n-hint${inputError ? ` ${id}-n-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThis')}
            </button>
          </div>
          <p id={`${id}-n-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t('binaryString.hint', { max: MAX_N })} />
          </p>
          {inputError && (
            <p id={`${id}-n-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
