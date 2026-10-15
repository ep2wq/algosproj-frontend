// Pure functions for the two grid lessons: counting islands with a stack, and the shortest
// path with a BFS queue and a dist grid. Neighbours are tried in the lessons' offset order:
// up, down, left, right. The player only reads these.

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

function joinAnd(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
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
export function islandsFrames(grid: string[]): GridFrame[] {
  const marks = emptyMarks(grid)
  const stack: Cell[] = []
  let count = 0
  const frame = frameMaker(grid, marks, stack)
  const frames = [frame({ description: `Scan row by row, with count = 0.` })]

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
          description: `${cellText([row, col])} is an unvisited 1: count = ${count}. Mark it and push it on the stack.`,
        }),
      )

      while (stack.length > 0) {
        const cell = stack.pop()!
        const added: Cell[] = []
        for (const [r, c] of neighbours(grid, cell)) {
          if (grid[r][c] === '1' && marks[r][c] === null) {
            marks[r][c] = count
            stack.push([r, c])
            added.push([r, c])
            island.push([r, c])
          }
        }
        const pushText = added.length === 0 ? 'No unmarked 1 is up, down, left or right of it.' : `Mark and push its unmarked 1 neighbours: ${joinAnd(added.map(cellText))}.`
        let doneText = ''
        if (stack.length === 0) {
          const inOrder = [...island].sort((a, b) => a[0] - b[0] || a[1] - b[1])
          doneText = ` The stack is empty: island ${count} is ${joinAnd(inOrder.map(cellText))}.`
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
          if (cornerCells.length > 0) {
            const one = cornerCells.length === 1
            doneText += ` ${joinAnd(cornerCells.map(cellText))} ${one ? 'touches' : 'touch'} it only at a corner, so ${one ? 'it is' : 'they are'} not part of it.`
          }
        }
        frames.push(frame({ current: cell, added, count, description: `Pop ${cellText(cell)}. ${pushText}${doneText}` }))
      }
    }
  }

  frames.push(frame({ count, output: String(count), description: `The scan has passed the last cell. Print ${count}.` }))
  return frames
}

// Expects 1 or more rows of the same length, each made of 0 and 1.
export function shortestPathFrames(grid: string[]): GridFrame[] {
  const marks = emptyMarks(grid)
  const queue: Cell[] = []
  const frame = frameMaker(grid, marks, queue)
  const end: Cell = [grid.length - 1, grid[0].length - 1]
  const startWall = grid[0][0] === '1'
  const endWall = grid[end[0]][end[1]] === '1'

  if (startWall || endWall) {
    const oneCell = end[0] === 0 && end[1] === 0
    const which = oneCell
      ? 'The only cell, (0, 0), is both the start and the end, and it is a wall'
      : startWall && endWall
        ? 'The start and the end are walls'
        : startWall
          ? 'The start, (0, 0), is a wall'
          : `The end, ${cellText(end)}, is a wall`
    return [frame({ output: '-1', description: `${which}, so there is no path. Print -1.` })]
  }

  marks[0][0] = 0
  queue.push([0, 0])
  const frames = [frame({ added: [[0, 0]], description: `Neither the start nor the end is a wall. Set dist[0][0] = 0 and queue the start.` })]

  while (queue.length > 0) {
    const cell = queue.shift()!
    const d = marks[cell[0]][cell[1]]!
    const added: Cell[] = []
    for (const [r, c] of neighbours(grid, cell)) {
      if (grid[r][c] === '0' && marks[r][c] === null) {
        marks[r][c] = d + 1
        queue.push([r, c])
        added.push([r, c])
      }
    }
    const take = `Take ${cellText(cell)} from the front, dist ${d}.`
    const addText =
      added.length === 0
        ? ' No open neighbour is still -1.'
        : ` ${joinAnd(added.map(cellText))} ${added.length === 1 ? 'is an open neighbour' : 'are open neighbours'} still at -1: dist ${d + 1}, added to the back.`
    const endText = added.some(([r, c]) => r === end[0] && c === end[1]) ? ` The end, ${cellText(end)}, gets ${d + 1}.` : ''
    frames.push(frame({ current: cell, added, description: `${take}${addText}${endText}` }))
  }

  const answer = marks[end[0]][end[1]]
  const result = answer === null ? `dist of the end is still -1: no path reaches it. Print -1.` : `dist of the end, ${cellText(end)}, is ${answer}. Print ${answer}.`
  frames.push(frame({ output: String(answer ?? -1), description: `The queue is empty. ${result}` }))
  return frames
}
