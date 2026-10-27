import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { attackedSquares, queensFrames, type QueensFrame, type TryOutcome } from './queensFrames'
import { usePlayback } from './usePlayback'

// The problem allows 1 <= n <= 10; the visual takes 4 or 5, so stepping through stays short and
// there is always at least one solution.
const MIN_N = 4
const MAX_N = 5

function randomN(not: number) {
  const choices = [4, 5].filter((n) => n !== not)
  return choices[Math.floor(Math.random() * choices.length)]
}

// Returns n, or an error message to show.
function parseN(text: string, t: T): number | string {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < MIN_N || Number(trimmed) > MAX_N) return t('queens.invalidN', { min: MIN_N, max: MAX_N })
  return Number(trimmed)
}

type Square = 'queen' | 'solution' | 'attacker' | 'placed' | 'conflict' | 'removed' | 'attacked' | 'empty'

function squareOf(frame: QueensFrame, attacked: Set<string>, row: number, col: number): Square {
  const tried = frame.row === row && frame.col === col
  if (frame.queens[row] === col) {
    if (frame.kind === 'solution') return 'solution'
    if (frame.kind === 'attacked' && frame.attacker === row) return 'attacker'
    if (frame.kind === 'place' && tried) return 'placed'
    return 'queen'
  }
  if (tried && frame.kind === 'attacked') return 'conflict'
  if (tried && frame.kind === 'remove') return 'removed'
  if (attacked.has(`${row},${col}`)) return 'attacked'
  return 'empty'
}

// Class names are written out in full so Tailwind generates them.
const SQUARE_CLASS: Record<Square, string> = {
  queen: 'border border-line text-ink',
  solution: 'border border-pass bg-pass text-inverse',
  attacker: 'border-4 border-fail text-ink',
  placed: 'border-4 border-warn text-ink',
  conflict: 'border-4 border-fail bg-fail/15 text-fail',
  removed: 'border-4 border-dashed border-warn text-warn',
  attacked: 'border border-line text-muted',
  empty: 'border border-line',
}

const SQUARE_TEXT: Record<Square, string> = {
  queen: '♛',
  solution: '♛',
  attacker: '♛',
  placed: '♛',
  conflict: '✗',
  removed: '↩',
  attacked: '•',
  empty: '',
}

// The name of each outcome is the key queens.try.<outcome>.
const TRY_TEXT: Record<TryOutcome, { symbol: string; className: string }> = {
  attacked: { symbol: '✗', className: 'border-line text-muted' },
  placed: { symbol: '♛', className: 'border-accent bg-accent-soft text-ink' },
  removed: { symbol: '↩', className: 'border-warn text-warn' },
}

function boardLabel(frame: QueensFrame, t: T) {
  const queens =
    frame.queens.length === 0
      ? t('queens.noQueens')
      : t('queens.queensAt', { list: frame.queens.map((c, r) => t('queens.square', { row: r + 1, col: c + 1 })).join(t('common.listSeparator')) })
  const params = { n: frame.n, queens, row: (frame.row ?? 0) + 1, col: (frame.col ?? 0) + 1, attacker: (frame.attacker ?? 0) + 1 }
  if (frame.row !== null && frame.col !== null) {
    if (frame.kind === 'attacked') return t('queens.boardAttacked', params)
    if (frame.kind === 'remove') return t('queens.boardRemoved', params)
    if (frame.kind === 'place') return t('queens.boardPlaced', params)
    if (frame.kind === 'solution') return t('queens.boardSolution', params)
  }
  return t('queens.board', params)
}

// The backtracking for "N-Queens": the board with the queens, the squares they attack and the
// square being tried, a trail of the columns tried in each row, and the solutions found.
export default function QueensVisual() {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [n, setN] = useState(4)
  const [nText, setNText] = useState('4')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => queensFrames(n, t), [n, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const attacked = attackedSquares(n, current.queens)
  const cells = Array.from({ length: n }, (_, i) => i)

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

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <p className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
          <span className="text-sm text-muted">{t('queens.solutionsFound')}</span>
          <span dir="ltr" className="text-lg font-semibold tabular-nums">{current.solutions}</span>
        </p>
        <p className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
          <span className="text-sm text-muted">{t('queens.firstSolution')}</span>
          <span dir="ltr" className="font-mono text-lg font-semibold">{current.first === null ? '-' : current.first.map((c) => c + 1).join(' ')}</span>
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="justify-self-start rounded-lg border border-line bg-surface p-2">
          <div role="img" aria-label={boardLabel(current, t)} dir="ltr">
            <div aria-hidden="true" className="flex">
              <span className="w-5" />
              {cells.map((col) => (
                <span key={col} className="w-10 text-center font-mono text-xs text-muted tabular-nums">
                  {col + 1}
                </span>
              ))}
            </div>
            {cells.map((row) => (
              <div key={row} aria-hidden="true" className="flex items-center">
                <span className="w-5 font-mono text-xs text-muted tabular-nums">{row + 1}</span>
                {cells.map((col) => {
                  const square = squareOf(current, attacked, row, col)
                  const dark = (row + col) % 2 === 1
                  return (
                    <span
                      key={col}
                      className={`flex size-10 items-center justify-center text-xl leading-none motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${
                        square === 'solution' || square === 'conflict' ? '' : dark ? 'bg-paper' : 'bg-surface'
                      } ${SQUARE_CLASS[square]}`}
                    >
                      <span className={square === 'conflict' ? 'font-bold motion-safe:animate-pulse-twice' : ''}>{SQUARE_TEXT[square]}</span>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{t('queens.rowsCols')}</p>
        </div>

        <div className="min-w-0 rounded-lg border border-line bg-surface p-3">
          <p className="text-sm font-medium">{t('queens.trailTitle')}</p>
          <ol dir="ltr" className="mt-2 space-y-1.5">
            {current.trail.map((tries, row) => {
              const earlier = current.row !== null && row > current.row && tries.length > 0
              return (
                <li
                  key={row}
                  aria-label={t(earlier ? 'queens.rowLabelEarlier' : 'queens.rowLabel', {
                    row: row + 1,
                    tries:
                      tries.length === 0
                        ? t('queens.nothingTried')
                        : tries.map((tried) => t('queens.tryEntry', { col: tried.col + 1, name: t(`queens.try.${tried.outcome}`) })).join(t('common.listSeparator')),
                  })}
                  // An abandoned row is muted (not faded, which fell below 4.5:1) and says "earlier branch".
                  className={`flex flex-wrap items-center gap-1 ${earlier ? 'text-muted' : ''} ${current.row === row ? 'font-semibold' : ''}`}
                >
                  <span aria-hidden="true" className="w-12 text-sm">
                    {t('queens.rowShort', { row: row + 1 })}
                  </span>
                  {tries.length === 0 && (
                    <span aria-hidden="true" className="text-xs text-muted">
                      -
                    </span>
                  )}
                  {tries.map((tried, index) => (
                    <span key={index} aria-hidden="true" className={`rounded border px-1 font-mono text-xs ${TRY_TEXT[tried.outcome].className}`}>
                      {tried.col + 1}
                      {TRY_TEXT[tried.outcome].symbol}
                    </span>
                  ))}
                  {earlier && (
                    <span aria-hidden="true" className="text-xs font-normal text-muted">
                      {t('queens.earlierBranch')}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-xs text-muted">
            <TextWithCode text={t('queens.trailLegend')} />
          </p>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border border-line bg-surface text-ink">
            ♛
          </span>
          {t('queens.legendQueen')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border border-line bg-surface">
            •
          </span>
          {t('queens.legendAttacked')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-warn bg-surface text-ink">
            ♛
          </span>
          {t('queens.legendPlaced')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-fail bg-fail/15 text-fail">
            ✗
          </span>
          {t('queens.legendConflict')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-fail bg-surface text-ink">
            ♛
          </span>
          {t('queens.legendAttacker')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-dashed border-warn bg-surface text-warn">
            ↩
          </span>
          {t('queens.legendRemoved')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border border-pass bg-pass text-inverse">
            ♛
          </span>
          {t('queens.legendSolution')}
        </li>
      </ul>

      {current.kind === 'solution' && (
        <p className="mt-3 inline-block rounded border border-pass bg-surface px-3 py-2 font-semibold text-pass">{t('queens.solutionBadge', { number: current.solutions })}</p>
      )}
      {current.output !== null && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')} <span className="font-mono whitespace-pre-line">{current.output}</span>
        </p>
      )}

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
            <TextWithCode text={t('queens.ownN')} />
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
              placeholder={t('queens.placeholder')}
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
            <TextWithCode text={t('queens.hint', { min: MIN_N, max: MAX_N })} />
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
