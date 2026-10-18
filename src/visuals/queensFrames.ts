// Pure function for the N-Queens lesson: place one queen per row, trying the columns from left
// to right; a column attacked by a queen above is skipped (pruning); when a row has no column
// left, go back and move the queen above (backtracking). The whole search runs, as in the
// problem: count every solution and keep the first. Rows and columns are 0-based here and
// 1-based in the text, like the problem. The player only reads these.

import type { T } from './i18n'

export type QueensKind = 'start' | 'attacked' | 'place' | 'solution' | 'remove' | 'done'

// What happened to one column tried in a row: attacked (skipped), a queen placed there and
// still standing, or a queen placed and later removed.
export type TryOutcome = 'attacked' | 'placed' | 'removed'

export type QueensFrame = {
  kind: QueensKind
  n: number
  queens: number[] // queens[r] is the column of the queen in row r, for the rows filled so far
  row: number | null // the row being worked on
  col: number | null // the square tried in this step (with row), or the square just emptied
  attacker: number | null // the row of the queen that attacks the tried square
  trail: { col: number; outcome: TryOutcome }[][] // per row: the columns tried since the row above last moved
  solutions: number
  first: number[] | null // the first solution, as columns
  output: string | null // the two printed lines, only in the last step
  description: string
}

// The first queen above (from row 0 down) that attacks (row, col), or null.
export function attackerOf(queens: number[], row: number, col: number): number | null {
  for (let r = 0; r < Math.min(row, queens.length); r++) {
    if (queens[r] === col || Math.abs(queens[r] - col) === row - r) return r
  }
  return null
}

// Every empty square that some queen attacks, as "row,col" keys.
export function attackedSquares(n: number, queens: number[]): Set<string> {
  const out = new Set<string>()
  for (const [r, c] of queens.entries()) {
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (row === r && col === c) continue
        if (row === r || col === c || Math.abs(row - r) === Math.abs(col - c)) out.add(`${row},${col}`)
      }
    }
  }
  for (const [r, c] of queens.entries()) out.delete(`${r},${c}`)
  return out
}

const columns = (queens: number[]) => queens.map((c) => c + 1).join(' ')

// Expects n >= 1.
export function queensFrames(n: number, t: T): QueensFrame[] {
  const frames: QueensFrame[] = []
  const queens: number[] = []
  const trail: { col: number; outcome: TryOutcome }[][] = Array.from({ length: n }, () => [])
  let solutions = 0
  let first: number[] | null = null

  function push(kind: QueensKind, row: number | null, col: number | null, attacker: number | null, description: string, output: string | null = null) {
    frames.push({
      kind,
      n,
      queens: [...queens],
      row,
      col,
      attacker,
      trail: trail.map((tries) => tries.map((t) => ({ ...t }))),
      solutions,
      first: first === null ? null : [...first],
      output,
      description,
    })
  }

  function place(row: number) {
    for (let col = 0; col < n; col++) {
      const last = col === n - 1
      const attacker = attackerOf(queens, row, col)
      if (attacker !== null) {
        const how = queens[attacker] === col ? t('queens.sameColumn') : t('queens.sameDiagonal')
        trail[row].push({ col, outcome: 'attacked' })
        const params = { row: row + 1, col: col + 1, attacker: attacker + 1, how }
        push('attacked', row, col, attacker, last ? t('queens.attackedLast', params) : t('queens.attackedNext', params))
        continue
      }
      queens.push(col)
      trail[row].push({ col, outcome: 'placed' })
      for (let below = row + 1; below < n; below++) trail[below] = []
      const next = row + 1 === n ? t('queens.fillsLast') : t('queens.moveOn', { row: row + 2 })
      push('place', row, col, null, `${t('queens.place', { row: row + 1, col: col + 1 })} ${next}`)

      if (row + 1 === n) {
        solutions++
        const isFirst = first === null
        if (isFirst) first = [...queens]
        const params = { number: solutions, columns: columns(queens) }
        push('solution', row, col, null, isFirst ? t('queens.solutionFirst', params) : t('queens.solution', params))
      } else {
        place(row + 1)
      }

      queens.pop()
      trail[row][trail[row].length - 1].outcome = 'removed'
      const params = { row: row + 1, col: col + 1, next: row + 2 }
      const complete = row + 1 === n
      push(
        'remove',
        row,
        col,
        null,
        complete
          ? last
            ? t('queens.removeCompleteLast', params)
            : t('queens.removeCompleteNext', params)
          : last
            ? t('queens.removeDeadLast', params)
            : t('queens.removeDeadNext', params),
      )
    }
  }

  push('start', 0, null, null, t('queens.start', { n }))
  place(0)
  const answer = first === null ? 'none' : columns(first)
  push(
    'done',
    null,
    null,
    null,
    first === null ? t('queens.doneNone', { count: solutions }) : t('queens.done', { count: solutions, answer }),
    `${solutions}\n${answer}`,
  )
  return frames
}
