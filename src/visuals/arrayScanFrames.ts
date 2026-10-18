// Pure functions that turn an array into the steps of a single left-to-right pass:
// a running total (sum) or a running best (maximum). The player only reads these.

import type { T } from './i18n'

export type ScanMode = 'sum' | 'max'

export type ScanFrame = {
  array: number[]
  current: number | null // index being looked at, or null before the first and after the last step
  value: number // running total, or best so far
  done: boolean
  description: string
}

// Wraps negatives in parentheses so "12 + (-3) = 9" reads clearly.
function term(n: number) {
  return n < 0 ? `(${n})` : String(n)
}

export function sumFrames(array: number[], t: T): ScanFrame[] {
  const frame = (current: number | null, value: number, description: string, done = false): ScanFrame => ({
    array: [...array],
    current,
    value,
    done,
    description,
  })

  let total = 0
  const frames = [frame(null, total, t('arrayScan.sumStart'))]
  array.forEach((n, index) => {
    const next = total + n
    frames.push(frame(index, next, t('arrayScan.add', { n, total, term: term(n), next })))
    total = next
  })
  frames.push(frame(null, total, t('arrayScan.sumDone', { total }), true))
  return frames
}

// Expects at least one number, like the problem (1 <= n).
export function maxFrames(array: number[], t: T): ScanFrame[] {
  const frame = (current: number | null, value: number, description: string, done = false): ScanFrame => ({
    array: [...array],
    current,
    value,
    done,
    description,
  })

  let best = array[0]
  const frames = [frame(0, best, t('arrayScan.maxStart', { best }))]
  for (let index = 1; index < array.length; index++) {
    const n = array[index]
    if (n > best) {
      frames.push(frame(index, n, t('arrayScan.bigger', { n, best })))
      best = n
    } else {
      frames.push(frame(index, best, t('arrayScan.notBigger', { n, best })))
    }
  }
  frames.push(frame(null, best, t('arrayScan.maxDone', { best }), true))
  return frames
}
