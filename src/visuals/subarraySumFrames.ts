// Pure function for counting subarrays that add up to k, as in the lesson: a running total
// (prefix sum) and a map from each total to how many times it has appeared, starting with
// {0: 1} for the empty prefix. The player only reads these.

import { joinAnd, type T } from './i18n'

export type SumEntry = { sum: number; times: number }

export type SumFrame = {
  values: number[]
  k: number
  read: number | null // position of the number read in this step
  prefixes: (number | null)[] // prefixes[j] = total of the first j numbers, once computed
  lookup: number | null // sum - k, looked up in this step
  matches: number[] // j with prefixes[j] = lookup: the subarrays from position j to read
  stored: number | null // total whose count went up in this step
  map: SumEntry[] // total -> times seen, in the order totals were first stored
  count: number
  output: string | null
  description: string
}

// Wraps negatives in parentheses so "3 - (-2) = 5" reads clearly.
function term(n: number) {
  return n < 0 ? `(${n})` : String(n)
}

// Expects 1 or more values.
export function subarraySumFrames(values: number[], k: number, t: T): SumFrame[] {
  const span = (from: number, to: number) => (from === to ? t('subarraySum.spanOne', { to }) : t('subarraySum.spanRange', { from, to }))
  const n = values.length
  const prefixes: (number | null)[] = [0, ...values.map(() => null)]
  const map: SumEntry[] = [{ sum: 0, times: 1 }]
  let sum = 0
  let count = 0
  const frame = (parts: { read?: number; lookup?: number; matches?: number[]; stored?: number; output?: string; description: string }): SumFrame => ({
    values: [...values],
    k,
    read: parts.read ?? null,
    prefixes: [...prefixes],
    lookup: parts.lookup ?? null,
    matches: [...(parts.matches ?? [])],
    stored: parts.stored ?? null,
    map: map.map((entry) => ({ ...entry })),
    count,
    output: parts.output ?? null,
    description: parts.description,
  })

  const frames = [
    frame({ description: t('subarraySum.start', { k }) }),
  ]

  for (let i = 0; i < n; i++) {
    const before = sum
    sum += values[i]
    prefixes[i + 1] = sum
    const lookup = sum - k
    const read = { value: values[i], i, before, term: term(values[i]), sum, termK: term(k), lookup, k }

    // Look up before storing, so the subarray is never empty.
    const entry = map.find((e) => e.sum === lookup)
    if (!entry) {
      frames.push(frame({ read: i, lookup, description: t('subarraySum.readMissing', { ...read, current: count }) }))
    } else {
      const matches: number[] = []
      for (let j = 0; j <= i; j++) if (prefixes[j] === lookup) matches.push(j)
      const old = count
      count += entry.times
      const totals = joinAnd(t, matches.map((j) => (j === 0 ? t('subarraySum.beforeEmpty') : t('subarraySum.before', { j }))))
      const subarrays = joinAnd(t, matches.map((j) => span(j, i)))
      const found = { ...read, times: t('subarraySum.times', { count: entry.times }), old, added: entry.times, total: count, totals, subarrays }
      frames.push(
        frame({
          read: i,
          lookup,
          matches,
          description: matches.length === 1 ? t('subarraySum.readFoundOne', found) : t('subarraySum.readFoundMany', found),
        }),
      )
    }

    const stored = map.find((e) => e.sum === sum)
    if (stored) stored.times++
    else map.push({ sum, times: 1 })
    frames.push(frame({ read: i, stored: sum, description: t('subarraySum.store', { sum, times: stored ? stored.times : 1 }) }))
  }

  frames.push(frame({ output: String(count), description: t('subarraySum.allRead', { count: n, result: count }) }))
  return frames
}
