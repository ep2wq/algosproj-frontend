// Pure function for counting subarrays that add up to k, as in the lesson: a running total
// (prefix sum) and a map from each total to how many times it has appeared, starting with
// {0: 1} for the empty prefix. The player only reads these.

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

function span(from: number, to: number) {
  return from === to ? `position ${to}` : `positions ${from} to ${to}`
}

function list(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function times(n: number) {
  return n === 1 ? 'once' : `${n} times`
}

// Expects 1 or more values.
export function subarraySumFrames(values: number[], k: number): SumFrame[] {
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
    frame({ description: `The map starts as {0: 1}: before the first number the total is 0, the empty prefix. sum = 0 and count = 0. Look for subarrays that add up to ${k}.` }),
  ]

  for (let i = 0; i < n; i++) {
    const before = sum
    sum += values[i]
    prefixes[i + 1] = sum
    const lookup = sum - k
    const read = `Read ${values[i]} (position ${i}): sum = ${before} + ${term(values[i])} = ${sum}. Look up sum - k = ${sum} - ${term(k)} = ${lookup}:`

    // Look up before storing, so the subarray is never empty.
    const entry = map.find((e) => e.sum === lookup)
    if (!entry) {
      frames.push(frame({ read: i, lookup, description: `${read} not in the map, so count stays ${count}.` }))
    } else {
      const matches: number[] = []
      for (let j = 0; j <= i; j++) if (prefixes[j] === lookup) matches.push(j)
      const old = count
      count += entry.times
      const totals = matches.map((j) => (j === 0 ? 'before position 0 (the empty prefix)' : `before position ${j}`))
      const subarrays = matches.map((j) => span(j, i))
      const which = matches.length === 1 ? `the total ${totals[0]}, so ${subarrays[0]} adds up` : `the totals ${list(totals)}, so ${list(subarrays)} each add up`
      frames.push(
        frame({
          read: i,
          lookup,
          matches,
          description: `${read} seen ${times(entry.times)}, so count = ${old} + ${entry.times} = ${count}. It matches ${which} to ${k}.`,
        }),
      )
    }

    const stored = map.find((e) => e.sum === sum)
    if (stored) stored.times++
    else map.push({ sum, times: 1 })
    frames.push(frame({ read: i, stored: sum, description: `Store ${sum}: the map now has ${sum}: ${stored ? stored.times : 1}.` }))
  }

  frames.push(frame({ output: String(count), description: `All ${n === 1 ? '1 number is' : `${n} numbers are`} read. Print ${count}.` }))
  return frames
}
