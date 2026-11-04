import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { DP_NS, type DpT } from './dpI18n'
import { editFrames, gridPathFrames, itemName, knapsackFrames, lcsFrames, type Cell, type DpTableFrame } from './dpTableFrames'
import { joinAnd } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import { useCentreCells, useScrollCue } from './useScrollCue'

// Limits so a table stays small: at most 7 by 7 cells, or 5 rows by 9 for knapsack.
const MAX_SIDE = 6
const MAX_ITEMS = 4
const MAX_W = 8
const MAX_LETTERS = 6

export type DpTableMode = 'grid' | 'knapsack' | 'lcs' | 'edit'

type TableInput =
  | { mode: 'grid'; grid: string[] }
  | { mode: 'knapsack'; items: [number, number][]; capacity: number }
  | { mode: 'lcs' | 'edit'; a: string; b: string }

// The problems' own limits, named in the hints.
const PROBLEM_LETTERS = { lcs: 1000, edit: 500 }
const NOTHING = '-'

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const randomWord = () => Array.from({ length: randomInt(3, MAX_LETTERS) }, () => pick(['a', 'b', 'c', 'd'])).join('')

function randomInput(mode: DpTableMode): TableInput {
  const roll = Math.random()
  if (mode === 'grid') {
    if (roll < 0.15) return { mode, grid: ['...', '.#.', '...'] }
    if (roll < 0.25) return { mode, grid: ['....#', '.#...', '...#.', '#....'] }
    const rows = randomInt(3, 5)
    const cols = randomInt(3, 5)
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() < 0.2 ? '#' : '.')).join(''))
    // Keep the start and the goal free, so there is something to count.
    grid[0] = `.${grid[0].slice(1)}`
    grid[rows - 1] = `${grid[rows - 1].slice(0, -1)}.`
    return { mode, grid }
  }
  if (mode === 'knapsack') {
    if (roll < 0.2) return { mode, items: [[1, 15], [3, 20], [4, 30]], capacity: 4 }
    if (roll < 0.3) return { mode, items: [[3, 5], [2, 3], [2, 3]], capacity: 4 }
    return { mode, items: Array.from({ length: 3 }, (): [number, number] => [randomInt(1, 5), randomInt(1, 40)]), capacity: randomInt(4, 7) }
  }
  if (mode === 'lcs') {
    if (roll < 0.15) return { mode, a: 'acb', b: 'abc' }
    if (roll < 0.25) return { mode, a: 'abcde', b: 'ace' }
    return { mode, a: randomWord(), b: randomWord() }
  }
  if (roll < 0.15) return { mode, a: 'ab', b: 'acd' }
  if (roll < 0.25) return { mode, a: 'horse', b: 'ros' }
  if (roll < 0.35) return { mode, a: 'cat', b: 'cut' }
  return { mode, a: randomWord(), b: randomWord() }
}

function framesFor(input: TableInput, t: DpT): DpTableFrame[] {
  if (input.mode === 'grid') return gridPathFrames(input.grid, t)
  if (input.mode === 'knapsack') return knapsackFrames(input, t)
  if (input.mode === 'lcs') return lcsFrames(input, t)
  return editFrames(input, t)
}

const isWhole = (part: string) => /^\d+$/.test(part)

// Returns the input, or the field and message of the error to show.
function parseInput(mode: DpTableMode, first: string, second: string, t: DpT): TableInput | { field: 1 | 2; error: string } {
  if (mode === 'grid') {
    const rows = first.split(/[\s,]+/).filter(Boolean)
    if (rows.length === 0) return { field: 1, error: t('grid.atLeastOneRow') }
    if (rows.some((row) => !/^[.#]+$/.test(row))) return { field: 1, error: t('dpTable.grid.onlyDots') }
    if (rows.length > MAX_SIDE || rows.some((row) => row.length > MAX_SIDE)) return { field: 1, error: t('grid.tooBig', { max: MAX_SIDE }) }
    const uneven = rows.findIndex((row) => row.length !== rows[0].length)
    if (uneven !== -1) return { field: 1, error: t('grid.uneven', { first: rows[0].length, row: uneven + 1, length: rows[uneven].length }) }
    return { mode, grid: rows }
  }
  if (mode === 'knapsack') {
    const items = first.split(',').map((item) => item.trim().split(/\s+/)).filter((parts) => parts[0] !== '')
    const valid = items.length >= 1 && items.length <= MAX_ITEMS && items.every((parts) => parts.length === 2 && parts.every(isWhole) && Number(parts[0]) >= 1 && Number(parts[0]) <= MAX_W && Number(parts[1]) <= 99)
    if (!valid) return { field: 1, error: t('dpTable.knapsack.itemsInvalid', { maxItems: MAX_ITEMS, max: MAX_W }) }
    const capacity = second.trim()
    if (!isWhole(capacity) || Number(capacity) < 1 || Number(capacity) > MAX_W) return { field: 2, error: t('dpTable.knapsack.capacityInvalid', { max: MAX_W }) }
    return { mode, items: items.map((parts): [number, number] => [Number(parts[0]), Number(parts[1])]), capacity: Number(capacity) }
  }
  const pattern = new RegExp(`^[a-z]{0,${MAX_LETTERS}}$`)
  if (!pattern.test(first.trim())) return { field: 1, error: t('dpTable.strings.invalid', { max: MAX_LETTERS }) }
  if (!pattern.test(second.trim())) return { field: 2, error: t('dpTable.strings.invalid', { max: MAX_LETTERS }) }
  return { mode, a: first.trim(), b: second.trim() }
}

// The name of a cell in the lesson's notation.
function cellName(mode: DpTableMode, [i, j]: Cell) {
  if (mode === 'grid') return `p[${i}][${j}]`
  if (mode === 'knapsack') return `best(${i}, ${j})`
  return `${mode === 'lcs' ? 'L' : 'D'}[${i}][${j}]`
}

// The row and column headings: numbers for the grid, items and capacities for knapsack, letters for strings.
function headings(input: TableInput, rows: number, cols: number) {
  if (input.mode === 'grid') return { rowHeads: Array.from({ length: rows }, (_, i) => String(i)), colHeads: Array.from({ length: cols }, (_, j) => String(j)) }
  if (input.mode === 'knapsack') {
    return {
      rowHeads: [NOTHING, ...input.items.map(([wt, val], k) => `${itemName(k)} (${wt}, ${val})`)],
      colHeads: Array.from({ length: cols }, (_, w) => String(w)),
    }
  }
  return { rowHeads: [NOTHING, ...input.a], colHeads: [NOTHING, ...input.b] }
}

const same = (a: Cell | null, i: number, j: number) => a !== null && a[0] === i && a[1] === j
const has = (cells: Cell[], i: number, j: number) => cells.some((cell) => same(cell, i, j))

function isBlocked(input: TableInput, i: number, j: number) {
  return input.mode === 'grid' && i > 0 && j > 0 && input.grid[i - 1][j - 1] === '#'
}

function cellClass(input: TableInput, frame: DpTableFrame, i: number, j: number) {
  const last = frame.cells.length - 1
  const lastCol = frame.cells[0].length - 1
  if (same(frame.current, i, j)) return 'border-warn bg-warn text-inverse'
  if (frame.answer && i === last && j === lastCol) return 'border-pass bg-pass text-inverse'
  if (has(frame.path, i, j)) return 'border-pass bg-pass/15 text-ink'
  if (has(frame.reads, i, j)) return 'border-dashed border-accent bg-surface text-ink'
  if (isBlocked(input, i, j)) return 'border-ink bg-ink text-inverse'
  if (frame.cells[i][j] === null) return 'border-line bg-paper text-muted'
  return 'border-muted bg-surface text-ink'
}

// The whole state in words: the headings, every row, the cell being computed (or traced) and what it reads.
function tableLabel(input: TableInput, frame: DpTableFrame, t: DpT) {
  const rows = frame.cells.length
  const cols = frame.cells[0].length
  const { rowHeads, colHeads } = headings(input, rows, cols)
  const separator = t('common.listSeparator')
  const parts = [t('dpTable.labelColumns', { heads: colHeads.join(separator) })]
  frame.cells.forEach((row, i) => {
    const cells = row.map((value, j) => (value === null ? t('shared.empty') : isBlocked(input, i, j) ? t('dpTable.cellBlocked') : String(value)))
    parts.push(t('dpTable.labelRow', { row: i, head: rowHeads[i], cells: cells.join(separator) }))
  })
  const name = (cell: Cell) => cellName(input.mode, cell)
  if (frame.current !== null && frame.path.length > 0) {
    parts.push(t('dpTable.labelBack', { cell: name(frame.current), path: frame.path.map(name).join(separator) }))
  } else if (frame.current !== null) {
    parts.push(frame.reads.length > 0 ? t('shared.labelCurrent', { cell: name(frame.current), reads: joinAnd(t, frame.reads.map(name)) }) : t('shared.labelCurrentAlone', { cell: name(frame.current) }))
  }
  if (frame.answer) parts.push(t('shared.labelAnswer', { cell: name([rows - 1, cols - 1]), value: frame.cells[rows - 1][cols - 1] }))
  return parts.join(' ')
}

// A two-dimensional DP table filled row by row: grid paths, knapsack, longest common subsequence or edit
// distance, the last two followed by the path traced back from the answer.
export default function DpTableVisual({ mode }: { mode: DpTableMode }) {
  const { t } = useTranslation(DP_NS, { nsMode: 'fallback' })
  const id = useId()
  const [input, setInput] = useState(() => randomInput(mode))
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [inputError, setInputError] = useState<{ field: 1 | 2; error: string } | null>(null)

  const frames = useMemo(() => framesFor(input, t), [input, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo, playing } = playback
  const current = frames[Math.min(step, lastStep)]
  const rows = current.cells.length
  const cols = current.cells[0].length
  const { rowHeads, colHeads } = headings(input, rows, cols)
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const focusColumn = current.current?.[1] ?? (current.answer ? cols - 1 : 0)
  useCentreCells(scrollRef, focusColumn, focusColumn, input)

  function restart(next: TableInput) {
    setInput(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(mode, first, second, t)
    if ('error' in parsed) {
      setInputError(parsed)
      return
    }
    setInputError(null)
    restart(parsed)
  }

  const headWidth = mode === 'knapsack' ? 'w-14' : 'w-5'
  const errorId = `${id}-error`
  const describedBy = (field: 1 | 2) => `${id}-hint${inputError?.field === field ? ` ${errorId}` : ''}`
  const fieldClass = (field: 1 | 2) =>
    `mt-1 block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${inputError?.field === field ? 'border-fail' : 'border-field hover:border-muted'}`
  const twoFields = mode !== 'grid'
  const labels = {
    grid: [t('dpTable.grid.inputLabel'), ''],
    knapsack: [t('dpTable.knapsack.itemsLabel'), t('dpTable.knapsack.capacityLabel')],
    lcs: [t('dpTable.strings.aLabel'), t('dpTable.strings.bLabel')],
    edit: [t('dpTable.strings.aLabel'), t('dpTable.strings.bLabel')],
  }[mode]
  const placeholders = {
    grid: [t('dpTable.grid.placeholder'), ''],
    knapsack: [t('dpTable.knapsack.itemsPlaceholder'), t('dpTable.knapsack.capacityPlaceholder')],
    lcs: [t('dpTable.strings.aPlaceholder'), t('dpTable.strings.bPlaceholder')],
    edit: [t('dpTable.strings.aPlaceholder'), t('dpTable.strings.bPlaceholder')],
  }[mode]
  const hint =
    mode === 'grid'
      ? t('dpTable.grid.hint', { max: MAX_SIDE })
      : mode === 'knapsack'
        ? t('dpTable.knapsack.hint', { maxItems: MAX_ITEMS, max: MAX_W })
        : t('dpTable.strings.hint', { max: MAX_LETTERS, limit: PROBLEM_LETTERS[mode] })

  return (
    <div className="mt-4 max-w-5xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={t('shared.region')}
        dir="ltr"
        ref={scrollRef}
        className={`mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
      >
        <div role="img" aria-label={tableLabel(input, current, t)} className="mx-auto w-max">
          <div className="flex gap-0.5">
            <span className={`${headWidth} shrink-0`} />
            {colHeads.map((head, j) => (
              <span key={j} data-index={j} className="w-8 text-center font-mono text-xs text-muted">
                {head}
              </span>
            ))}
          </div>
          {current.cells.map((row, i) => (
            <div key={i} className="mt-0.5 flex items-center gap-0.5">
              <span className={`${headWidth} shrink-0 pe-1 text-end font-mono text-xs leading-tight text-muted`}>
                {mode === 'knapsack' && i > 0 ? (
                  <>
                    {itemName(i - 1)}
                    <span className="block text-[10px]">{rowHeads[i].slice(2)}</span>
                  </>
                ) : (
                  rowHeads[i]
                )}
              </span>
              {row.map((value, j) => {
                const onPath = has(current.path, i, j)
                return (
                  <span
                    key={j}
                    className={`relative flex size-8 items-center justify-center rounded border-2 text-sm font-semibold tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${cellClass(input, current, i, j)}`}
                  >
                    {isBlocked(input, i, j) && <span className="absolute top-0 start-0.5 text-[9px] leading-none font-medium">#</span>}
                    {onPath && <span className="absolute top-0 end-0.5 text-[10px] leading-none">•</span>}
                    {value ?? ''}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-warn" aria-hidden="true" />
          {t('shared.legendCurrent')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-dashed border-accent bg-surface" aria-hidden="true" />
          {t('shared.legendRead')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-pass bg-pass" aria-hidden="true" />
          {t('shared.legendAnswer')}
        </li>
        {(mode === 'lcs' || mode === 'edit') && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-5 rounded border-2 border-pass bg-pass/15" aria-hidden="true" />
            <TextWithCode text={t('dpTable.legendPath')} />
          </li>
        )}
        {mode === 'grid' && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-5 rounded border-2 border-ink bg-ink" aria-hidden="true" />
            <TextWithCode text={t('dpTable.legendBlocked')} />
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-line bg-paper" aria-hidden="true" />
          {t('shared.legendEmpty')}
        </li>
        <li>
          <TextWithCode text={mode === 'grid' ? t('dpTable.legendGrid') : mode === 'knapsack' ? t('dpTable.legendKnapsack') : t('dpTable.legendStrings')} />
        </li>
      </ul>

      {current.found !== null && (
        <p className="mt-3 inline-flex flex-wrap items-baseline gap-x-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <span className="text-muted">
            <TextWithCode text={mode === 'lcs' ? t('dpTable.foundLcs') : t('dpTable.foundEdit')} />
          </span>
          {mode === 'lcs' ? (
            <span dir="ltr" className="font-mono font-semibold">{current.found || NOTHING}</span>
          ) : (
            <span className="font-semibold">
              <TextWithCode text={current.found || t('dpTable.none')} />
            </span>
          )}
        </p>
      )}

      {current.output !== null && (
        <p className="mt-3 block w-fit rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')} <span className="font-mono">{current.output}</span>
        </p>
      )}

      {/* Quiet while playing (a sentence per step would flood a screen reader); read out when paused. */}
      <p aria-live={playing ? 'off' : 'polite'} className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomInput(mode))} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-first`} className="block text-sm font-medium">
                <TextWithCode text={labels[0]} />
              </label>
              <input
                id={`${id}-first`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={first}
                onChange={(event) => setFirst(event.target.value)}
                placeholder={placeholders[0]}
                aria-invalid={inputError?.field === 1}
                aria-describedby={describedBy(1)}
                className={fieldClass(1)}
              />
            </div>
            {twoFields && (
              <div className={mode === 'knapsack' ? 'w-28 shrink-0' : 'min-w-0 flex-1 basis-40'}>
                <label htmlFor={`${id}-second`} className="block text-sm font-medium">
                  <TextWithCode text={labels[1]} />
                </label>
                <input
                  id={`${id}-second`}
                  type="text"
                  inputMode={mode === 'knapsack' ? 'numeric' : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  value={second}
                  onChange={(event) => setSecond(event.target.value)}
                  placeholder={placeholders[1]}
                  aria-invalid={inputError?.field === 2}
                  aria-describedby={describedBy(2)}
                  className={fieldClass(2)}
                />
              </div>
            )}
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThis')}
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={hint} />
          </p>
          {inputError && (
            <p id={errorId} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError.error} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export function GridPathsVisual() {
  return <DpTableVisual mode="grid" />
}

export function KnapsackVisual() {
  return <DpTableVisual mode="knapsack" />
}

export function LcsVisual() {
  return <DpTableVisual mode="lcs" />
}

export function EditDistanceVisual() {
  return <DpTableVisual mode="edit" />
}
