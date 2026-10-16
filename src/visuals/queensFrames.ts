// Pure function for the N-Queens lesson: place one queen per row, trying the columns from left
// to right; a column attacked by a queen above is skipped (pruning); when a row has no column
// left, go back and move the queen above (backtracking). The whole search runs, as in the
// problem: count every solution and keep the first. Rows and columns are 0-based here and
// 1-based in the text, like the problem. The player only reads these.

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
export function queensFrames(n: number): QueensFrame[] {
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
        const how = queens[attacker] === col ? 'same column' : 'same diagonal'
        trail[row].push({ col, outcome: 'attacked' })
        push(
          'attacked',
          row,
          col,
          attacker,
          `Row ${row + 1}: column ${col + 1} is attacked by the queen in row ${attacker + 1} (${how}), ${last ? 'and it is the last column.' : 'try the next column.'}`,
        )
        continue
      }
      queens.push(col)
      trail[row].push({ col, outcome: 'placed' })
      for (let below = row + 1; below < n; below++) trail[below] = []
      const next = row + 1 === n ? 'That fills the last row.' : `Move on to row ${row + 2}.`
      push('place', row, col, null, `Row ${row + 1}: column ${col + 1} is safe. Place a queen there (choose). ${next}`)

      if (row + 1 === n) {
        solutions++
        const isFirst = first === null
        if (isFirst) first = [...queens]
        push(
          'solution',
          row,
          col,
          null,
          `Every row has a queen: solution ${solutions}, columns ${columns(queens)}.${isFirst ? ' It is the first one found, so it is the one to print.' : ''} Keep searching for more.`,
        )
      } else {
        place(row + 1)
      }

      queens.pop()
      trail[row][trail[row].length - 1].outcome = 'removed'
      const why = row + 1 === n ? 'that board was complete' : `row ${row + 2} has no column left to try, a dead end`
      push(
        'remove',
        row,
        col,
        null,
        `Back in row ${row + 1}: ${why}. Remove the queen from column ${col + 1} (undo)${last ? '. It was the last column of this row.' : ' and try the next column.'}`,
      )
    }
  }

  push('start', 0, null, null, `An empty ${n} by ${n} board. Fill the rows from 1 to ${n}, trying the columns from 1 to ${n} in each row.`)
  place(0)
  const answer = first === null ? 'none' : columns(first)
  push(
    'done',
    null,
    null,
    null,
    `Row 1 has tried every column: the search is over. ${solutions} ${solutions === 1 ? 'solution' : 'solutions'}; print ${solutions}, then ${first === null ? 'none' : `the first one, ${answer}`}.`,
    `${solutions}\n${answer}`,
  )
  return frames
}
