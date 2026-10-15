// Pure function for the longest substring without a repeated letter, as in the lesson: a
// sliding window from left to right and a map from each letter to where it was last seen.
// The player only reads these.

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

export function longestSubstringFrames(s: string): WindowFrame[] {
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

  const shown = s === '' ? 'an empty line' : `"${s}"`
  const frames = [frame({ right: null, description: `Take ${shown}, with left = 0 and best = 0. The last-seen map is empty.` })]

  for (let right = 0; right < s.length; right++) {
    const letter = s[right]
    const entry = last.find((e) => e.letter === letter)
    let move: string
    if (!entry) {
      move = `${letter} is new`
    } else {
      const p = entry.index
      const next = Math.max(left, p + 1)
      move =
        p >= left
          ? `${letter} was last seen at ${p}, inside the window, so left = max(${left}, ${p} + 1) = ${next}`
          : `${letter} was last seen at ${p}, before left = ${left}, so that copy is outside the window: left = max(${left}, ${p} + 1) = ${left} and stays where it is`
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
    let bestText: string
    if (length > best) {
      best = length
      bestStart = left
      bestText = `so best = ${best}`
    } else {
      bestText = `best stays ${best}`
    }
    frames.push(
      frame({
        right,
        earlier,
        stayed,
        description: `right = ${right}, ${letter}: ${move}. Store ${letter} at ${right}. Window "${s.slice(left, right + 1)}", length ${length}, ${bestText}.`,
      }),
    )
  }

  const end =
    s === ''
      ? 'The line is empty, so the loop never runs.'
      : `right has passed the last letter. The longest window is "${s.slice(bestStart, bestStart + best)}", at positions ${bestStart} to ${bestStart + best - 1}.`
  frames.push(frame({ right: null, output: String(best), description: `${end} Print ${best}.` }))
  return frames
}
