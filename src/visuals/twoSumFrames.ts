// Pure function for Two Sum with a hash map: one walk, look up the partner, then store.
// The player only reads these.

import type { T } from './i18n'

export type MapEntry = { value: number; index: number }

export type TwoSumFrame = {
  values: number[]
  target: number
  current: number | null // position being read
  partner: number | null // target - value, the value looked up
  foundAt: number | null // position of the partner, when the lookup finds it
  map: MapEntry[] // value -> position, in the order values were first stored
  stored: number | null // value stored in this step
  answer: [number, number] | null
  description: string
}

// Wraps negatives in parentheses so "9 - (-3) = 12" reads clearly.
function term(n: number) {
  return n < 0 ? `(${n})` : String(n)
}

// Every pair of positions i < j with values[i] + values[j] = target.
export function pairsAddingUpTo(values: number[], target: number) {
  const pairs: [number, number][] = []
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] + values[j] === target) pairs.push([i, j])
    }
  }
  return pairs
}

// Expects input with exactly one pair, as the problem guarantees.
export function twoSumFrames(values: number[], target: number, t: T): TwoSumFrame[] {
  const map: MapEntry[] = []
  const frame = (parts: Partial<Omit<TwoSumFrame, 'values' | 'target' | 'map' | 'description'>> & { description: string }): TwoSumFrame => ({
    values: [...values],
    target,
    current: parts.current ?? null,
    partner: parts.partner ?? null,
    foundAt: parts.foundAt ?? null,
    map: map.map((entry) => ({ ...entry })),
    stored: parts.stored ?? null,
    answer: parts.answer ? [...parts.answer] : null,
    description: parts.description,
  })

  const frames = [frame({ description: t('twoSum.start', { target }) })]
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const partner = target - value
    const question = t('twoSum.question', { i, value, target, term: term(value), partner })

    // Look up first. The map only holds earlier positions, so a value never pairs with itself.
    const found = map.find((entry) => entry.value === partner)
    if (found) {
      const answer: [number, number] = [found.index, i]
      frames.push(
        frame({
          current: i,
          partner,
          foundAt: found.index,
          answer,
          description: `${question} ${t('twoSum.yes', { at: found.index, i })}`,
        }),
      )
      return frames
    }

    // Then store. A value seen before gets its newer position, as in a hash map.
    const existing = map.find((entry) => entry.value === value)
    if (existing) existing.index = i
    else map.push({ value, index: i })
    const replaced = existing ? ` ${t('twoSum.replaced', { value, i })}` : ''
    frames.push(frame({ current: i, partner, stored: value, description: `${question} ${t('twoSum.no', { value, i })}${replaced}` }))
  }
  return frames
}
