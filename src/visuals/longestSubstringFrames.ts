// Pure function for the longest substring without a repeated letter, as in the lesson: a
// sliding window from left to right and a map from each letter to where it was last seen.
// The player only reads these.

import type { T } from './i18n'

export type LastSeen = { letter: string; index: number }

export type WindowFrame = {
  s: string
  left: number
  right: number | null // null before the first letter and after the last
  last: LastSeen[] // letter -> last position, in the order letters were first seen
  earlier: number | null // where the letter at right was last seen before this step
  stayed: boolean // the earlier copy was already outside the window, so left did not move
  best: number
  bestStart: number // start of the first window of length best
  output: string | null
  description: string
}

export function longestSubstringFrames(s: string, t: T): WindowFrame[] {
  const last: LastSeen[] = []
  let left = 0
  let best = 0
  let bestStart = 0
  const frame = (parts: { right: number | null; earlier?: number; stayed?: boolean; output?: string; description: string }): WindowFrame => ({
    s,
    left,
    right: parts.right,
    last: last.map((entry) => ({ ...entry })),
    earlier: parts.earlier ?? null,
    stayed: parts.stayed ?? false,
    best,
    bestStart,
    output: parts.output ?? null,
    description: parts.description,
  })

  const frames = [frame({ right: null, description: s === '' ? t('longestSubstring.startEmpty') : t('longestSubstring.start', { s }) })]

  for (let right = 0; right < s.length; right++) {
    const letter = s[right]
    const entry = last.find((e) => e.letter === letter)
    let move: string
    if (!entry) {
      move = t('longestSubstring.stepNew', { right, letter })
    } else {
      const p = entry.index
      const params = { right, letter, p, left, next: Math.max(left, p + 1) }
      move = p >= left ? t('longestSubstring.stepInside', params) : t('longestSubstring.stepOutside', params)
    }
    const earlier = entry?.index
    const stayed = entry !== undefined && entry.index < left
    if (entry) {
      left = Math.max(left, entry.index + 1)
      entry.index = right
    } else {
      last.push({ letter, index: right })
    }

    const length = right - left + 1
    const grew = length > best
    if (grew) {
      best = length
      bestStart = left
    }
    const store = { letter, right, window: s.slice(left, right + 1), length, best }
    frames.push(
      frame({
        right,
        earlier,
        stayed,
        description: `${move} ${grew ? t('longestSubstring.storeBest', store) : t('longestSubstring.storeStays', store)}`,
      }),
    )
  }

  const end =
    s === ''
      ? t('longestSubstring.endEmpty', { best })
      : t('longestSubstring.end', { window: s.slice(bestStart, bestStart + best), from: bestStart, to: bestStart + best - 1, best })
  frames.push(frame({ right: null, output: String(best), description: end }))
  return frames
}
