// Pure functions for the two grid lessons: counting islands with a stack, and the shortest
// path with a BFS queue and a dist grid. Neighbours are tried in the lessons' offset order:
// up, down, left, right. The player only reads these.

import { joinAnd, value, type T } from './i18n'

export type GridMode = 'islands' | 'shortest'

export type Cell = [number, number] // [row, column]

export type GridFrame = {
  grid: string[]
  marks: (number | null)[][] // islands: the island number of a marked cell; shortest: dist, null for -1
  current: Cell | null // islands: the cell found or popped; shortest: the cell taken from the front
  pending: Cell[] // the stack (bottom first) or the queue (front first)
  added: Cell[] // cells marked and pushed or queued in this step
  count: number // islands found so far; unused for the shortest path
  output: string | null
  description: string
}

const OFFSETS: Cell[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function cellText([row, col]: Cell) {
  return `(${row}, ${col})`
}

function emptyMarks(grid: string[]) {
  return grid.map((row) => [...row].map((): number | null => null))
}

function frameMaker(grid: string[], marks: (number | null)[][], pending: Cell[]) {
  return (parts: { current?: Cell; added?: Cell[]; count?: number; output?: string; description: string }): GridFrame => ({
    grid: [...grid],
    marks: marks.map((row) => [...row]),
    current: parts.current ? [...parts.current] : null,
    pending: pending.map((cell): Cell => [...cell]),
    added: (parts.added ?? []).map((cell): Cell => [...cell]),
    count: parts.count ?? 0,
    output: parts.output ?? null,
    description: parts.description,
  })
}

function neighbours(grid: string[], [row, col]: Cell) {
  const cells: Cell[] = []
  for (const [dr, dc] of OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) cells.push([r, c])
  }
  return cells
}

// Expects 1 or more rows of the same length, each made of 0 and 1.
export function islandsFrames(grid: string[], t: T): GridFrame[] {
  const cell = (c: Cell) => value(t, cellText(c))
  const cells = (list: Cell[]) => joinAnd(t, list.map(cell))
  const marks = emptyMarks(grid)
  const stack: Cell[] = []
  let count = 0
  const frame = frameMaker(grid, marks, stack)
  const frames = [frame({ description: t('grid.scanStart') })]

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] !== '1' || marks[row][col] !== null) continue
      count++
      marks[row][col] = count
      stack.push([row, col])
      const island: Cell[] = [[row, col]]
      frames.push(
        frame({
          current: [row, col],
          added: [[row, col]],
          count,
          description: t('grid.found', { cell: cell([row, col]), value: count }),
        }),
      )

      while (stack.length > 0) {
        const popped = stack.pop()!
        const added: Cell[] = []
        for (const [r, c] of neighbours(grid, popped)) {
          if (grid[r][c] === '1' && marks[r][c] === null) {
            marks[r][c] = count
            stack.push([r, c])
            added.push([r, c])
            island.push([r, c])
          }
        }
        const parts = [t('grid.pop', { cell: cell(popped) }), added.length === 0 ? t('grid.noNeighbour') : t('grid.pushNeighbours', { cells: cells(added) })]
        if (stack.length === 0) {
          const inOrder = [...island].sort((a, b) => a[0] - b[0] || a[1] - b[1])
          parts.push(t('grid.islandDone', { island: count, cells: cells(inOrder) }))
          // Unmarked 1s that touch the finished island only at a corner are not part of it.
          const corners = new Map<string, Cell>()
          for (const [row, col] of inOrder) {
            for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
              const r = row + dr
              const c = col + dc
              if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] === '1' && marks[r][c] === null) corners.set(`${r},${c}`, [r, c])
            }
          }
          const cornerCells = [...corners.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
          if (cornerCells.length > 0) parts.push(t('grid.cornerTouch', { cells: cells(cornerCells), count: cornerCells.length }))
        }
        frames.push(frame({ current: popped, added, count, description: parts.join(' ') }))
      }
    }
  }

  frames.push(frame({ count, output: String(count), description: t('grid.scanDone', { result: count }) }))
  return frames
}

// Expects 1 or more rows of the same length, each made of 0 and 1.
export function shortestPathFrames(grid: string[], t: T): GridFrame[] {
  const cell = (c: Cell) => value(t, cellText(c))
  const marks = emptyMarks(grid)
  const queue: Cell[] = []
  const frame = frameMaker(grid, marks, queue)
  const end: Cell = [grid.length - 1, grid[0].length - 1]
  const startWall = grid[0][0] === '1'
  const endWall = grid[end[0]][end[1]] === '1'

  if (startWall || endWall) {
    const oneCell = end[0] === 0 && end[1] === 0
    const description = oneCell
      ? t('grid.wallOnly')
      : startWall && endWall
        ? t('grid.wallBoth')
        : startWall
          ? t('grid.wallStart')
          : t('grid.wallEnd', { end: cell(end) })
    return [frame({ output: '-1', description })]
  }

  marks[0][0] = 0
  queue.push([0, 0])
  const frames = [frame({ added: [[0, 0]], description: t('grid.queueStart') })]

  while (queue.length > 0) {
    const taken = queue.shift()!
    const d = marks[taken[0]][taken[1]]!
    const added: Cell[] = []
    for (const [r, c] of neighbours(grid, taken)) {
      if (grid[r][c] === '0' && marks[r][c] === null) {
        marks[r][c] = d + 1
        queue.push([r, c])
        added.push([r, c])
      }
    }
    const parts = [
      t('grid.take', { cell: cell(taken), dist: d }),
      added.length === 0 ? t('grid.noOpen') : t('grid.openNeighbours', { cells: joinAnd(t, added.map(cell)), count: added.length, dist: d + 1 }),
    ]
    if (added.some(([r, c]) => r === end[0] && c === end[1])) parts.push(t('grid.endGets', { end: cell(end), dist: d + 1 }))
    frames.push(frame({ current: taken, added, description: parts.join(' ') }))
  }

  const answer = marks[end[0]][end[1]]
  const description = answer === null ? t('grid.noPath') : t('grid.pathFound', { end: cell(end), answer })
  frames.push(frame({ output: String(answer ?? -1), description }))
  return frames
}
