// Pure functions for the four two-dimensional dynamic programming lessons, in the lessons' own notation:
// grid paths (p with an extra row and column of zeros, p[0][1] = 1 seeds the start), knapsack (best(i, w)
// over the first i items, the lesson's example table), longest common subsequence (L[i][j]) and edit
// distance (D[i][j], row 0 and column 0 the base cases). Filled row by row, one cell per step; LCS and
// edit distance then trace the path back, one cell per step. The player only reads these.

import type { DpT } from './dpI18n'

export type Cell = [number, number] // [row, column]

export type DpTableFrame = {
  cells: (number | null)[][] // null: not computed yet
  current: Cell | null // the cell being computed, or the traceback's cell
  reads: Cell[] // the cells it reads
  path: Cell[] // traceback: the cells walked so far, from the answer back
  answer: boolean // the answer cell is final (green)
  output: string | null
  found: string | null // LCS: the subsequence read so far; edit distance: the operations so far
  description: string
}

function frameMaker(cells: (number | null)[][], path: Cell[]) {
  return (parts: { current?: Cell; reads?: Cell[]; answer?: boolean; output?: string; found?: string; description: string }): DpTableFrame => ({
    cells: cells.map((row) => [...row]),
    current: parts.current ? [...parts.current] : null,
    reads: (parts.reads ?? []).map((cell): Cell => [...cell]),
    path: path.map((cell): Cell => [...cell]),
    answer: parts.answer ?? false,
    output: parts.output ?? null,
    found: parts.found ?? null,
    description: parts.description,
  })
}

const table = (rows: number, cols: number, fill: (i: number, j: number) => number | null) =>
  Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => fill(i, j)))

// Expects 1 or more rows of the same length, each made of . (free) and # (blocked).
export function gridPathFrames(grid: string[], t: DpT): DpTableFrame[] {
  const r = grid.length
  const c = grid[0].length
  const p = table(r + 1, c + 1, (i, j) => (i === 0 || j === 0 ? (i === 0 && j === 1 ? 1 : 0) : null))
  const frame = frameMaker(p, [])
  const frames = [frame({ description: t('dpTable.grid.start') })]
  for (let i = 1; i <= r; i++) {
    for (let j = 1; j <= c; j++) {
      if (grid[i - 1][j - 1] === '#') {
        p[i][j] = 0
        frames.push(frame({ current: [i, j], description: t('dpTable.grid.blocked', { cell: `p[${i}][${j}]` }) }))
        continue
      }
      const up = p[i - 1][j] as number
      const left = p[i][j - 1] as number
      p[i][j] = up + left
      const formula = `p[${i}][${j}] = p[${i - 1}][${j}] + p[${i}][${j - 1}] = ${up} + ${left} = ${up + left}`
      frames.push(frame({ current: [i, j], reads: [[i - 1, j], [i, j - 1]], description: t('dpTable.grid.step', { formula }) }))
    }
  }
  const answer = p[r][c] as number
  frames.push(frame({ answer: true, output: String(answer), description: t('shared.done', { cell: `p[${r}][${c}]`, value: answer }) }))
  return frames
}

export const itemName = (index: number) => String.fromCharCode(65 + index) // A, B, C, ... as in the lesson

// Expects 1 or more items [weight, value] with weight >= 1, and capacity >= 1.
export function knapsackFrames({ items, capacity }: { items: [number, number][]; capacity: number }, t: DpT): DpTableFrame[] {
  const n = items.length
  const best = table(n + 1, capacity + 1, (i) => (i === 0 ? 0 : null))
  const frame = frameMaker(best, [])
  const frames = [frame({ description: t('dpTable.knapsack.start') })]
  for (let i = 1; i <= n; i++) {
    const [wt, val] = items[i - 1]
    const item = `${itemName(i - 1)} (${wt}, ${val})`
    for (let w = 0; w <= capacity; w++) {
      const without = best[i - 1][w] as number
      if (wt > w) {
        best[i][w] = without
        frames.push(frame({ current: [i, w], reads: [[i - 1, w]], description: t('dpTable.knapsack.noFit', { item, w, result: `best(${i}, ${w}) = best(${i - 1}, ${w}) = ${without}` }) }))
        continue
      }
      const before = best[i - 1][w - wt] as number
      const withIt = val + before
      const result = Math.max(without, withIt)
      best[i][w] = result
      const kind = withIt > without ? 'take' : withIt < without ? 'skip' : 'tie'
      frames.push(
        frame({
          current: [i, w],
          reads: [[i - 1, w], [i - 1, w - wt]],
          description: t(`dpTable.knapsack.${kind}`, {
            item,
            w,
            without: `best(${i - 1}, ${w}) = ${without}`,
            with: `${val} + best(${i - 1}, ${w - wt}) = ${val} + ${before} = ${withIt}`,
            result: `best(${i}, ${w}) = max(${without}, ${withIt}) = ${result}`,
          }),
        }),
      )
    }
  }
  const answer = best[n][capacity] as number
  frames.push(frame({ answer: true, output: String(answer), description: t('shared.done', { cell: `best(${n}, ${capacity})`, value: answer }) }))
  return frames
}

// Expects two strings of a to z (either may be empty). A runs down the rows, B across the columns.
export function lcsFrames({ a, b }: { a: string; b: string }, t: DpT): DpTableFrame[] {
  const n = a.length
  const m = b.length
  const L = table(n + 1, m + 1, (i, j) => (i === 0 || j === 0 ? 0 : null))
  const path: Cell[] = []
  const frame = frameMaker(L, path)
  const frames = [frame({ description: t('dpTable.lcs.start') })]
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cell = `L[${i}][${j}]`
      if (a[i - 1] === b[j - 1]) {
        const diag = L[i - 1][j - 1] as number
        L[i][j] = diag + 1
        frames.push(frame({ current: [i, j], reads: [[i - 1, j - 1]], description: t('dpTable.lcs.equal', { letter: a[i - 1], formula: `${cell} = L[${i - 1}][${j - 1}] + 1 = ${diag} + 1 = ${diag + 1}` }) }))
      } else {
        const up = L[i - 1][j] as number
        const left = L[i][j - 1] as number
        L[i][j] = Math.max(up, left)
        frames.push(
          frame({
            current: [i, j],
            reads: [[i - 1, j], [i, j - 1]],
            description: t('dpTable.lcs.differ', { x: a[i - 1], y: b[j - 1], formula: `${cell} = max(L[${i - 1}][${j}], L[${i}][${j - 1}]) = max(${up}, ${left}) = ${Math.max(up, left)}` }),
          }),
        )
      }
    }
  }
  const answer = L[n][m] as number
  frames.push(frame({ answer: true, description: t('dpTable.lcs.answer', { cell: `L[${n}][${m}]`, value: answer }) }))

  // Traceback from L[n][m] to row 0 or column 0: equal letters go diagonally and join the subsequence;
  // otherwise go to the larger neighbour, up when they are equal.
  let i = n
  let j = m
  let found = ''
  while (i > 0 && j > 0) {
    path.push([i, j])
    const cell = `L[${i}][${j}]`
    if (a[i - 1] === b[j - 1]) {
      found = a[i - 1] + found
      frames.push(frame({ current: [i, j], reads: [[i - 1, j - 1]], answer: true, found, description: t('dpTable.lcs.backEqual', { cell, letter: a[i - 1], next: `L[${i - 1}][${j - 1}]` }) }))
      i--
      j--
    } else {
      const up = L[i - 1][j] as number
      const left = L[i][j - 1] as number
      const goUp = up >= left
      const next = goUp ? `L[${i - 1}][${j}]` : `L[${i}][${j - 1}]`
      frames.push(
        frame({ current: [i, j], reads: [goUp ? [i - 1, j] : [i, j - 1]], answer: true, found, description: t(goUp ? 'dpTable.lcs.backUp' : 'dpTable.lcs.backLeft', { cell, x: a[i - 1], y: b[j - 1], up, left, next }) }),
      )
      if (goUp) i--
      else j--
    }
  }
  path.push([i, j])
  frames.push(
    frame({
      current: [i, j],
      answer: true,
      found,
      output: String(answer),
      description: found ? t('dpTable.lcs.end', { cell: `L[${i}][${j}]`, found, value: answer }) : t('dpTable.lcs.endEmpty', { cell: `L[${i}][${j}]` }),
    }),
  )
  return frames
}

// Expects two strings of a to z (either may be empty): A turns into B. A runs down the rows, B across.
export function editFrames({ a, b }: { a: string; b: string }, t: DpT): DpTableFrame[] {
  const n = a.length
  const m = b.length
  const D = table(n + 1, m + 1, (i, j) => (i === 0 || j === 0 ? i + j : null))
  const path: Cell[] = []
  const frame = frameMaker(D, path)
  const frames = [frame({ description: t('dpTable.edit.start') })]
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = a[i - 1] === b[j - 1]
      const diag = (D[i - 1][j - 1] as number) + (same ? 0 : 1)
      const up = (D[i - 1][j] as number) + 1
      const left = (D[i][j - 1] as number) + 1
      const result = Math.min(diag, up, left)
      D[i][j] = result
      const params = {
        x: a[i - 1],
        y: b[j - 1],
        diag: same ? `D[${i - 1}][${j - 1}] = ${diag}` : `D[${i - 1}][${j - 1}] + 1 = ${diag}`,
        up: `D[${i - 1}][${j}] + 1 = ${up}`,
        left: `D[${i}][${j - 1}] + 1 = ${left}`,
        result: `D[${i}][${j}] = min(${diag}, ${up}, ${left}) = ${result}`,
      }
      frames.push(frame({ current: [i, j], reads: [[i - 1, j - 1], [i - 1, j], [i, j - 1]], description: t(same ? 'dpTable.edit.equal' : 'dpTable.edit.differ', params) }))
    }
  }
  const answer = D[n][m] as number
  frames.push(frame({ answer: true, description: t('dpTable.edit.answer', { cell: `D[${n}][${m}]`, value: answer }) }))

  // Traceback from D[n][m] to D[0][0]: the diagonal when it gave the value (keep an equal letter, or
  // replace), else up (delete A's letter), else left (insert B's letter).
  let i = n
  let j = m
  const ops: string[] = []
  const list = () => ops.join(t('common.listSeparator'))
  while (i > 0 || j > 0) {
    path.push([i, j])
    const cell = `D[${i}][${j}]`
    const value = D[i][j] as number
    if (i > 0 && j > 0 && value === (D[i - 1][j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      const same = a[i - 1] === b[j - 1]
      if (!same) ops.unshift(t('dpTable.edit.opReplace', { x: a[i - 1], y: b[j - 1] }))
      frames.push(frame({ current: [i, j], reads: [[i - 1, j - 1]], answer: true, found: list(), description: t(same ? 'dpTable.edit.backKeep' : 'dpTable.edit.backReplace', { cell, x: a[i - 1], y: b[j - 1], next: `D[${i - 1}][${j - 1}]` }) }))
      i--
      j--
    } else if (i > 0 && value === (D[i - 1][j] as number) + 1) {
      ops.unshift(t('dpTable.edit.opDelete', { x: a[i - 1] }))
      frames.push(frame({ current: [i, j], reads: [[i - 1, j]], answer: true, found: list(), description: t('dpTable.edit.backDelete', { cell, x: a[i - 1], next: `D[${i - 1}][${j}]` }) }))
      i--
    } else {
      ops.unshift(t('dpTable.edit.opInsert', { y: b[j - 1] }))
      frames.push(frame({ current: [i, j], reads: [[i, j - 1]], answer: true, found: list(), description: t('dpTable.edit.backInsert', { cell, y: b[j - 1], next: `D[${i}][${j - 1}]` }) }))
      j--
    }
  }
  path.push([0, 0])
  frames.push(
    frame({
      current: [0, 0],
      answer: true,
      found: list(),
      output: String(answer),
      description: ops.length > 0 ? t('dpTable.edit.end', { ops: list(), value: answer }) : t('dpTable.edit.endNone'),
    }),
  )
  return frames
}
