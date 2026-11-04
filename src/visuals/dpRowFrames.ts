// Pure functions for the three one-row dynamic programming lessons, in the lessons' own notation:
// climbing stairs (ways[i] = ways[i - 1] + ways[i - 2]), house robber (best[i] over the first i
// houses) and coin change (best[x], INF = amount + 1, amounts outer and coins inner, as the lesson's
// loops). Each frame is the whole row at that point. The player only reads these.

import type { DpT } from './dpI18n'

export type DpRowFrame = {
  cells: (number | null)[] // null: not computed yet
  current: number | null // the cell being computed
  reads: number[] // the cells it reads
  house: number | null // house robber: the house i whose value v[i - 1] is read
  coin: number | null // coin change: the index of the coin being tried
  done: boolean // the last frame: the answer is the last cell
  output: string | null
  description: string
}

function frameMaker(cells: (number | null)[]) {
  return (parts: { current?: number; reads?: number[]; house?: number; coin?: number; done?: boolean; output?: string; description: string }): DpRowFrame => ({
    cells: [...cells],
    current: parts.current ?? null,
    reads: parts.reads ?? [],
    house: parts.house ?? null,
    coin: parts.coin ?? null,
    done: parts.done ?? false,
    output: parts.output ?? null,
    description: parts.description,
  })
}

// Expects 1 <= n.
export function stairsFrames(n: number, t: DpT): DpRowFrame[] {
  const cells: (number | null)[] = Array.from({ length: n + 1 }, () => null)
  cells[0] = 1
  cells[1] = 1
  const frame = frameMaker(cells)
  const frames = [frame({ description: t('dpRow.stairs.start') })]
  for (let i = 2; i <= n; i++) {
    const a = cells[i - 1] as number
    const b = cells[i - 2] as number
    cells[i] = a + b
    const formula = `ways[${i}] = ways[${i - 1}] + ways[${i - 2}] = ${a} + ${b} = ${a + b}`
    frames.push(frame({ current: i, reads: [i - 1, i - 2], description: t('dpRow.stairs.step', { i, a: i - 1, b: i - 2, formula }) }))
  }
  frames.push(frame({ done: true, output: String(cells[n]), description: t('dpRow.done', { cell: `ways[${n}]`, value: cells[n] }) }))
  return frames
}

// Expects 1 or more house values (v[0] is house 1).
export function houseFrames(v: number[], t: DpT): DpRowFrame[] {
  const n = v.length
  const cells: (number | null)[] = Array.from({ length: n + 1 }, () => null)
  cells[0] = 0
  cells[1] = v[0]
  const frame = frameMaker(cells)
  const frames = [frame({ description: t('dpRow.house.start', { first: v[0] }) })]
  for (let i = 2; i <= n; i++) {
    const skip = cells[i - 1] as number
    const before = cells[i - 2] as number
    const take = before + v[i - 1]
    const result = Math.max(skip, take)
    cells[i] = result
    const kind = take > skip ? 'take' : take < skip ? 'skip' : 'tie'
    frames.push(
      frame({
        current: i,
        reads: [i - 1, i - 2],
        house: i,
        description: t(`dpRow.house.${kind}`, {
          i,
          v: v[i - 1],
          skip: `best[${i - 1}] = ${skip}`,
          take: `${v[i - 1]} + best[${i - 2}] = ${v[i - 1]} + ${before} = ${take}`,
          result: `best[${i}] = max(${skip}, ${take}) = ${result}`,
        }),
      }),
    )
  }
  frames.push(frame({ done: true, output: String(cells[n]), description: t('dpRow.done', { cell: `best[${n}]`, value: cells[n] }) }))
  return frames
}

// INF as the row shows it.
export function coinText(value: number, inf: number) {
  return value >= inf ? 'INF' : String(value)
}

// Expects 0 <= amount and 1 or more distinct coin values of at least 1.
export function coinFrames({ amount, coins }: { amount: number; coins: number[] }, t: DpT): DpRowFrame[] {
  const inf = amount + 1
  const cells: (number | null)[] = Array.from({ length: amount + 1 }, (_, x) => (x === 0 ? 0 : inf))
  const frame = frameMaker(cells)
  const frames = [frame({ description: t('dpRow.coins.start', { inf }) })]
  for (let x = 1; x <= amount; x++) {
    let tried = false
    coins.forEach((c, index) => {
      if (c > x) return
      tried = true
      const r = x - c
      const old = cells[x] as number
      const from = cells[r] as number
      const parts = { current: x, reads: [r], coin: index }
      if (from >= inf) {
        frames.push(frame({ ...parts, description: t('dpRow.coins.fromInf', { x, c, r, old: coinText(old, inf) }) }))
        return
      }
      const candidate = from + 1
      const expr = `best[${r}] + 1 = ${from} + 1 = ${candidate}`
      if (candidate < old) {
        cells[x] = candidate
        frames.push(frame({ ...parts, description: t('dpRow.coins.better', { x, c, expr, old: coinText(old, inf), result: `best[${x}] = ${candidate}` }) }))
      } else {
        frames.push(frame({ ...parts, description: t('dpRow.coins.notBetter', { x, c, expr, old: coinText(old, inf) }) }))
      }
    })
    if (!tried) frames.push(frame({ current: x, description: t('dpRow.coins.noCoin', { x }) }))
  }
  const answer = cells[amount] as number
  frames.push(
    answer < inf
      ? frame({ done: true, output: String(answer), description: t('dpRow.done', { cell: `best[${amount}]`, value: answer }) })
      : frame({ done: true, output: '-1', description: t('dpRow.coins.none', { x: amount }) }),
  )
  return frames
}
