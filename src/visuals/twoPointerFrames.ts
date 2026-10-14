// Pure functions for the two-pointer technique on a string: reversing it, and checking
// whether it is a palindrome. The player only reads these.

export type PointerMode = 'reverse' | 'palindrome'

export type PointerFrame = {
  chars: string[]
  left: number | null // null once the pointers are no longer shown
  right: number | null
  active: number[] // indices swapped (reverse) or compared (palindrome) in this step
  settled: number[] // indices already in their final place (reverse) or already matched (palindrome)
  mismatch: boolean // palindrome: the compared pair differs
  result: string | null // shown when finished
  description: string
}

function name(c: string) {
  return c === ' ' ? 'the space' : `"${c}"`
}

function frameMaker(chars: string[]) {
  return (parts: Omit<PointerFrame, 'chars' | 'mismatch' | 'result'> & { mismatch?: boolean; result?: string }): PointerFrame => ({
    chars: [...chars],
    left: parts.left,
    right: parts.right,
    active: [...parts.active],
    settled: [...parts.settled],
    mismatch: parts.mismatch ?? false,
    result: parts.result ?? null,
    description: parts.description,
  })
}

export function reverseFrames(text: string): PointerFrame[] {
  const chars = [...text]
  const frame = frameMaker(chars)
  const settled: number[] = []
  let left = 0
  let right = chars.length - 1
  const frames = [
    frame({ left, right, active: [], settled, description: 'Put L on the first character and R on the last.' }),
  ]

  while (left < right) {
    const a = chars[left]
    const b = chars[right]
    chars[left] = b
    chars[right] = a
    frames.push(
      frame({
        left,
        right,
        active: [left, right],
        settled,
        description: `Swap ${name(a)} and ${name(b)} at positions ${left} and ${right}, then move both pointers inward.`,
      }),
    )
    settled.push(left, right)
    left++
    right--
  }

  if (left === right) {
    settled.push(left)
    frames.push(
      frame({
        left,
        right,
        active: [],
        settled,
        description: `L and R meet at position ${left}. The middle character, ${name(chars[left])}, stays where it is.`,
      }),
    )
  }

  const reversed = chars.join('')
  frames.push(frame({ left: null, right: null, active: [], settled, result: `Reversed: "${reversed}"`, description: `Done: the reversed text is "${reversed}".` }))
  return frames
}

// The problem's rule: the word is lowercase letters a-z, compared exactly as given.
export function palindromeFrames(text: string): PointerFrame[] {
  const chars = [...text]
  const frame = frameMaker(chars)
  const settled: number[] = []
  let left = 0
  let right = chars.length - 1
  const frames = [
    frame({ left, right, active: [], settled, description: 'Put L on the first character and R on the last.' }),
  ]

  while (left < right) {
    const a = chars[left]
    const b = chars[right]
    if (a !== b) {
      frames.push(
        frame({
          left,
          right,
          active: [left, right],
          settled,
          mismatch: true,
          result: 'Not a palindrome',
          description: `${name(a)} and ${name(b)} differ, so stop here. Not a palindrome.`,
        }),
      )
      return frames
    }
    frames.push(
      frame({
        left,
        right,
        active: [left, right],
        settled,
        description: `${name(a)} and ${name(b)} match, so move both pointers inward.`,
      }),
    )
    settled.push(left, right)
    left++
    right--
  }

  if (left === right) settled.push(left)
  const why =
    chars.length === 1
      ? 'A single character reads the same both ways.'
      : left === right
        ? `L and R meet at the middle character, ${name(chars[left])}, and every pair matched.`
        : 'L and R have crossed, and every pair matched.'
  frames.push(frame({ left: null, right: null, active: [], settled, result: 'Palindrome', description: `${why} Palindrome.` }))
  return frames
}
