// Pure functions for the two-pointer technique on a string: reversing it, and checking
// whether it is a palindrome. The player only reads these.

import type { T } from './i18n'

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

function name(c: string, t: T) {
  return c === ' ' ? t('twoPointer.space') : t('twoPointer.quoted', { c })
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

export function reverseFrames(text: string, t: T): PointerFrame[] {
  const chars = [...text]
  const frame = frameMaker(chars)
  const settled: number[] = []
  let left = 0
  let right = chars.length - 1
  const frames = [
    frame({ left, right, active: [], settled, description: t('twoPointer.start') }),
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
        description: t('twoPointer.swap', { a: name(a, t), b: name(b, t), left, right }),
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
        description: t('twoPointer.meet', { position: left, c: name(chars[left], t) }),
      }),
    )
  }

  const reversed = chars.join('')
  frames.push(frame({ left: null, right: null, active: [], settled, result: t('twoPointer.reversed', { text: reversed }), description: t('twoPointer.reverseDone', { text: reversed }) }))
  return frames
}

// The problem's rule: the word is lowercase letters a-z, compared exactly as given.
export function palindromeFrames(text: string, t: T): PointerFrame[] {
  const chars = [...text]
  const frame = frameMaker(chars)
  const settled: number[] = []
  let left = 0
  let right = chars.length - 1
  const frames = [
    frame({ left, right, active: [], settled, description: t('twoPointer.start') }),
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
          result: t('twoPointer.notPalindrome'),
          description: t('twoPointer.differ', { a: name(a, t), b: name(b, t) }),
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
        description: t('twoPointer.match', { a: name(a, t), b: name(b, t) }),
      }),
    )
    settled.push(left, right)
    left++
    right--
  }

  if (left === right) settled.push(left)
  const description =
    chars.length === 1
      ? t('twoPointer.single')
      : left === right
        ? t('twoPointer.meetMiddle', { c: name(chars[left], t) })
        : t('twoPointer.crossed')
  frames.push(frame({ left: null, right: null, active: [], settled, result: t('twoPointer.palindromeResult'), description }))
  return frames
}
