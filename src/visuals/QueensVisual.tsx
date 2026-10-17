import { useId, useMemo, useState, type FormEvent } from 'react'
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
function parseN(text: string): number | string {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < MIN_N || Number(trimmed) > MAX_N) return `Enter one whole number from ${MIN_N} to ${MAX_N}.`
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

const TRY_TEXT: Record<TryOutcome, { symbol: string; name: string; className: string }> = {
  attacked: { symbol: '✗', name: 'attacked', className: 'border-line text-muted' },
  placed: { symbol: '♛', name: 'queen placed', className: 'border-accent bg-accent-soft text-ink' },
  removed: { symbol: '↩', name: 'queen removed', className: 'border-warn text-warn' },
}

function boardLabel(frame: QueensFrame) {
  const queens = frame.queens.length === 0 ? 'no queens' : `queens at ${frame.queens.map((c, r) => `row ${r + 1} column ${c + 1}`).join(', ')}`
  let now = ''
  if (frame.row !== null && frame.col !== null) {
    if (frame.kind === 'attacked') now = ` Trying row ${frame.row + 1} column ${frame.col + 1}: attacked by the queen in row ${frame.attacker! + 1}.`
    else if (frame.kind === 'remove') now = ` Queen just removed from row ${frame.row + 1} column ${frame.col + 1}.`
    else if (frame.kind === 'place') now = ` Queen just placed in row ${frame.row + 1} column ${frame.col + 1}.`
    else if (frame.kind === 'solution') now = ' The board is a solution.'
  }
  return `${frame.n} by ${frame.n} board, ${queens}.${now}`
}

// The backtracking for "N-Queens": the board with the queens, the squares they attack and the
// square being tried, a trail of the columns tried in each row, and the solutions found.
export default function QueensVisual() {
  const id = useId()
  const [n, setN] = useState(4)
  const [nText, setNText] = useState('4')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => queensFrames(n), [n])
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
    const parsed = parseN(nText)
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
          <span className="text-sm text-muted">solutions found</span>
          <span className="text-lg font-semibold tabular-nums">{current.solutions}</span>
        </p>
        <p className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
          <span className="text-sm text-muted">first solution</span>
          <span className="font-mono text-lg font-semibold">{current.first === null ? '-' : current.first.map((c) => c + 1).join(' ')}</span>
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="justify-self-start rounded border border-line bg-surface p-2">
          <div role="img" aria-label={boardLabel(current)}>
            <div aria-hidden="true" className="flex">
              <span className="w-5" />
              {cells.map((col) => (
                <span key={col} className="w-10 text-center text-xs text-muted tabular-nums">
                  {col + 1}
                </span>
              ))}
            </div>
            {cells.map((row) => (
              <div key={row} aria-hidden="true" className="flex items-center">
                <span className="w-5 text-xs text-muted tabular-nums">{row + 1}</span>
                {cells.map((col) => {
                  const square = squareOf(current, attacked, row, col)
                  const dark = (row + col) % 2 === 1
                  return (
                    <span
                      key={col}
                      className={`flex size-10 items-center justify-center text-xl leading-none motion-safe:transition-colors motion-safe:duration-300 ${
                        square === 'solution' || square === 'conflict' ? '' : dark ? 'bg-paper' : 'bg-surface'
                      } ${SQUARE_CLASS[square]}`}
                    >
                      <span className={square === 'conflict' ? 'font-bold motion-safe:animate-pulse' : ''}>{SQUARE_TEXT[square]}</span>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Small numbers: rows and columns.</p>
        </div>

        <div className="min-w-0 rounded border border-line bg-surface p-3">
          <p className="text-sm font-medium">Columns tried in each row</p>
          <ol className="mt-2 space-y-1.5">
            {current.trail.map((tries, row) => {
              const earlier = current.row !== null && row > current.row && tries.length > 0
              return (
                <li
                  key={row}
                  aria-label={`Row ${row + 1}: ${tries.length === 0 ? 'nothing tried yet' : tries.map((t) => `column ${t.col + 1} ${TRY_TEXT[t.outcome].name}`).join(', ')}${earlier ? ' (an earlier branch, abandoned)' : ''}.`}
                  // An abandoned row is muted (not faded, which fell below 4.5:1) and says "earlier branch".
                  className={`flex flex-wrap items-center gap-1 ${earlier ? 'text-muted' : ''} ${current.row === row ? 'font-semibold' : ''}`}
                >
                  <span aria-hidden="true" className="w-12 text-sm">
                    Row {row + 1}
                  </span>
                  {tries.length === 0 && (
                    <span aria-hidden="true" className="text-xs text-muted">
                      -
                    </span>
                  )}
                  {tries.map((t, index) => (
                    <span key={index} aria-hidden="true" className={`rounded border px-1 font-mono text-xs ${TRY_TEXT[t.outcome].className}`}>
                      {t.col + 1}
                      {TRY_TEXT[t.outcome].symbol}
                    </span>
                  ))}
                  {earlier && (
                    <span aria-hidden="true" className="text-xs font-normal text-muted">
                      earlier branch
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-xs text-muted">✗ attacked, skipped. ♛ queen placed. ↩ queen removed (backtrack). Abandoned rows belong to a branch already abandoned.</p>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border border-line bg-surface text-ink">
            ♛
          </span>
          Queen
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border border-line bg-surface">
            •
          </span>
          Attacked by a queen
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-warn bg-surface text-ink">
            ♛
          </span>
          Queen just placed
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-fail bg-fail/15 text-fail">
            ✗
          </span>
          Tried square, attacked
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-fail bg-surface text-ink">
            ♛
          </span>
          The queen that attacks it
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border-2 border-dashed border-warn bg-surface text-warn">
            ↩
          </span>
          Queen just removed
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center border border-pass bg-pass text-inverse">
            ♛
          </span>
          Queens of a solution
        </li>
      </ul>

      {current.kind === 'solution' && (
        <p className="mt-3 inline-block rounded border border-pass bg-surface px-3 py-2 font-semibold text-pass">✓ Solution {current.solutions}</p>
      )}
      {current.output !== null && (
        <p className="mt-3 inline-block rounded border border-line bg-surface px-3 py-2 font-semibold">
          Output: <span className="font-mono whitespace-pre-line">{current.output}</span>
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomN(n))} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-n`} className="block text-sm font-medium">
            Your own n
          </label>
          <div className="mt-1 flex max-w-xs gap-2">
            <input
              id={`${id}-n`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={nText}
              onChange={(event) => setNText(event.target.value)}
              placeholder="e.g. 4"
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-n-hint${inputError ? ` ${id}-n-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use this
            </button>
          </div>
          <p id={`${id}-n-hint`} className="mt-1 text-xs text-muted">
            A whole number from {MIN_N} to {MAX_N}, so the board stays readable. (The problem allows n from 1 to 10; n = 2 and 3 have no solution.)
          </p>
          {inputError && (
            <p id={`${id}-n-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
