import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { componentColor } from './componentColors'
import { cellText, islandsFrames, shortestPathFrames, type Cell, type GridFrame, type GridMode } from './gridFrames'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import { useScrollCue } from './useScrollCue'

// The problems allow grids up to 50 by 50; 8 by 8 fits on screen.
const MAX_SIDE = 8

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomGrid(rows: number, cols: number, density: number) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() < density ? '1' : '0')).join(''))
}

// Grids where 1s touch only at corners, so every 1 is its own island.
function diagonalGrid() {
  const size = randomInt(3, 6)
  const roll = Math.random()
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (roll < 0.4) return (r + c) % 2 === 0 ? '1' : '0'
      if (roll < 0.7) return r === c ? '1' : '0'
      return r === c || r + c === size - 1 ? '1' : '0'
    }).join(''),
  )
}

const MODES = {
  islands: {
    frames: islandsFrames,
    random: () => {
      const roll = Math.random()
      if (roll < 0.15) return ['11000', '11000', '00100', '00011']
      if (roll < 0.4) return diagonalGrid()
      return randomGrid(randomInt(4, 7), randomInt(4, 7), 0.45)
    },
  },
  shortest: {
    frames: shortestPathFrames,
    random: () => {
      if (Math.random() < 0.15) return ['00000', '00000', '00001', '00100']
      const grid = randomGrid(randomInt(4, 7), randomInt(4, 7), 0.28)
      // Usually keep the start and end open, so the search has something to do.
      if (Math.random() < 0.85) {
        grid[0] = `0${grid[0].slice(1)}`
        const last = grid.length - 1
        grid[last] = `${grid[last].slice(0, -1)}0`
      }
      return grid
    },
  },
}

function parseGrid(text: string, t: T): string[] | string {
  const rows = text.split(/[\s,]+/).filter(Boolean)
  if (rows.length === 0) return t('grid.atLeastOneRow')
  if (rows.some((row) => !/^[01]+$/.test(row))) return t('grid.onlyBinary')
  if (rows.length > MAX_SIDE || rows.some((row) => row.length > MAX_SIDE)) {
    return t('grid.tooBig', { max: MAX_SIDE })
  }
  const uneven = rows.findIndex((row) => row.length !== rows[0].length)
  if (uneven !== -1) return t('grid.uneven', { first: rows[0].length, row: uneven + 1, length: rows[uneven].length })
  return rows
}

const same = (a: Cell | null, r: number, c: number) => a !== null && a[0] === r && a[1] === c
const has = (cells: Cell[], r: number, c: number) => cells.some((cell) => cell[0] === r && cell[1] === c)

function islandCellClass(frame: GridFrame, r: number, c: number) {
  const island = frame.marks[r][c]
  const dashed = has(frame.pending, r, c) ? 'border-dashed' : ''
  if (island !== null) {
    const color = componentColor(island)
    return `${color.bg} ${same(frame.current, r, c) ? 'border-warn' : color.border} ${dashed} text-ink`
  }
  if (frame.grid[r][c] === '1') return 'border-muted bg-line text-ink'
  return 'border-line bg-surface text-muted'
}

function shortestCellClass(frame: GridFrame, r: number, c: number) {
  if (frame.grid[r][c] === '1') return 'border-ink bg-ink text-inverse'
  const isEnd = r === frame.grid.length - 1 && c === frame.grid[0].length - 1
  if (frame.output !== null && isEnd && frame.marks[r][c] !== null) return 'border-pass bg-pass text-inverse'
  if (same(frame.current, r, c)) return 'border-warn bg-warn text-inverse'
  if (has(frame.pending, r, c)) return 'border-warn bg-amber-100 dark:bg-amber-950 text-ink'
  if (frame.marks[r][c] !== null) return 'border-line bg-paper text-muted'
  return 'border-line bg-surface text-ink'
}

function gridLabel(mode: GridMode, frame: GridFrame, t: T) {
  const rows = frame.grid.map((row, r) => {
    const cells = [...row].map((ch, c) => {
      const mark = frame.marks[r][c]
      if (mode === 'islands') return mark !== null ? t('grid.cellIsland', { id: mark }) : ch === '1' ? t('grid.cellUnmarked') : '0'
      if (ch === '1') return t('grid.cellWall')
      return mark !== null ? t('grid.cellDist', { dist: mark }) : t('grid.cellOpen')
    })
    return t('grid.rowLabel', { row: r, cells: cells.join(t('common.listSeparator')) })
  }).join(t('grid.rowSeparator'))
  return frame.current ? t('grid.labelAt', { rows, cell: cellText(frame.current) }) : t('grid.label', { rows })
}

// Two grid searches: counting islands with a stack, and the shortest path with a BFS queue.
export default function GridVisual({ mode }: { mode: GridMode }) {
  const { t } = useTranslation('visuals')
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const id = useId()
  const config = MODES[mode]
  const [grid, setGrid] = useState(config.random)
  const [gridText, setGridText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => config.frames(grid, t), [config, grid, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const rows = current.grid.length
  const cols = current.grid[0].length

  function restart(next: string[]) {
    setGrid(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseGrid(gridText, t)
    if (typeof parsed === 'string') {
      setInputError(parsed)
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

      {mode === 'islands' && (
        <p className="mt-4 inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
          <span className="text-sm text-muted">count</span>
          <span dir="ltr" className="text-lg font-semibold tabular-nums">{current.count}</span>
        </p>
      )}

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          tabIndex={0}
          role="region"
          aria-label={t('grid.region')}
          dir="ltr"
          ref={scrollRef}
          className={`overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
        >
          <div role="img" aria-label={gridLabel(mode, current, t)} className="w-max">
            <div className="flex gap-0.5 ps-5">
              {Array.from({ length: cols }, (_, c) => (
                <span key={c} className="w-8 text-center text-xs text-muted tabular-nums">
                  {c}
                </span>
              ))}
            </div>
            {current.grid.map((row, r) => (
              <div key={r} className="mt-0.5 flex items-center gap-0.5">
                <span className="w-4.5 text-end text-xs text-muted tabular-nums">{r}</span>
                {[...row].map((_, c) => {
                  const mark = current.marks[r][c]
                  const cellClass = mode === 'islands' ? islandCellClass(current, r, c) : shortestCellClass(current, r, c)
                  const corner = mode === 'shortest' ? (r === 0 && c === 0 ? 'S' : r === rows - 1 && c === cols - 1 ? 'E' : '') : ''
                  return (
                    <span
                      key={c}
                      className={`relative flex size-8 items-center justify-center rounded border-2 text-sm font-semibold tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${cellClass}`}
                    >
                      {corner && <span className="absolute top-0 start-0.5 text-[9px] leading-none font-medium">{corner}</span>}
                      {mark ?? ''}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            <TextWithCode text={mode === 'islands' ? t('grid.stackTitle') : t('grid.queueTitle')} />
          </p>
          <div
            aria-label={
              mode === 'islands'
                ? t('grid.stackLabel', { list: current.pending.length === 0 ? t('grid.empty') : current.pending.map(cellText).join(', ') })
                : t('grid.queueLabel', { list: current.pending.length === 0 ? t('grid.empty') : current.pending.map(cellText).join(', ') })
            }
            dir="ltr"
            className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1.5"
          >
            {current.pending.length === 0 && <span className="px-1 text-sm text-muted">{t('grid.empty')}</span>}
            {current.pending.map((cell) => (
              <span
                key={cellText(cell)}
                className={`rounded border px-1.5 py-0.5 text-xs font-medium tabular-nums ${has(current.added, cell[0], cell[1]) ? 'border-accent bg-accent-soft' : 'border-muted bg-surface'}`}
              >
                {cellText(cell)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {mode === 'islands' ? (
          <>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-muted bg-line" aria-hidden="true" />
              <TextWithCode text={t('grid.legendUnmarked')} />
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-line bg-surface" aria-hidden="true" />
              <TextWithCode text={t('grid.legendZero')} />
            </li>
            <li>{t('grid.legendColoured')}</li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-surface" aria-hidden="true" />
              <TextWithCode text={t('grid.legendFound')} />
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-dashed border-muted bg-surface" aria-hidden="true" />
              <TextWithCode text={t('grid.legendOnStack')} />
            </li>
          </>
        ) : (
          <>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-ink bg-ink" aria-hidden="true" />
              {t('grid.legendWall')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-warn" aria-hidden="true" />
              {t('grid.legendTaken')}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-amber-100 dark:bg-amber-950" aria-hidden="true" />
              <TextWithCode text={t('grid.legendInQueue')} />
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-5 rounded border-2 border-pass bg-pass" aria-hidden="true" />
              {t('grid.legendEnd')}
            </li>
            <li>
              <TextWithCode text={t('grid.legendNumbers')} />
            </li>
          </>
        )}
        <li>{t('grid.legendOutside')}</li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')} <span className="font-mono">{current.output}</span>
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(config.random())} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-input`} className="block text-sm font-medium">
                {t('grid.ownGrid')}
              </label>
              <input
                id={`${id}-input`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={gridText}
                onChange={(event) => setGridText(event.target.value)}
                placeholder={mode === 'islands' ? t('grid.placeholderIslands') : t('grid.placeholderShortest')}
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
            <TextWithCode text={mode === 'islands' ? t('grid.hintIslands', { max: MAX_SIDE }) : t('grid.hintShortest', { max: MAX_SIDE })} />
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

export function IslandsVisual() {
  return <GridVisual mode="islands" />
}

export function ShortestPathVisual() {
  return <GridVisual mode="shortest" />
}
