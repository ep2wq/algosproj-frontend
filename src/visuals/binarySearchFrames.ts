// Pure function that turns a sorted array and a target into the steps of a binary search.
// The player only reads these; there is no animation logic here.

export type SearchFrame = {
  array: number[]
  low: number | null // null once the search has ended without finding the target
  high: number | null
  mid: number | null
  possible: [number, number] | null // indices (inclusive) where the target can still be, or null if none
  result: number | null // index, or -1 when not found; null while still searching
  description: string
}

export function binarySearchFrames(array: number[], target: number): SearchFrame[] {
  const frame = (parts: Omit<SearchFrame, 'array' | 'result'> & { result?: number }): SearchFrame => ({
    array: [...array],
    ...parts,
    result: parts.result ?? null,
  })

  const frames: SearchFrame[] = []
  let low = 0
  let high = array.length - 1
  frames.push(
    frame({
      low,
      high,
      mid: null,
      possible: array.length > 0 ? [low, high] : null,
      description: `Search for ${target}. Every index from ${low} to ${high} is still possible.`,
    }),
  )

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2)
    const value = array[mid]
    frames.push(frame({ low, high, mid, possible: [low, high], description: `Look at the middle: index ${mid} holds ${value}.` }))

    if (value === target) {
      frames.push(
        frame({ low, high, mid, possible: [mid, mid], result: mid, description: `${value} is the target. Found at index ${mid}.` }),
      )
      return frames
    }

    // This frame still shows the old low and high; the dimmed half is what's being discarded.
    if (value > target) {
      const nextHigh = mid - 1
      frames.push(
        frame({
          low,
          high,
          mid,
          possible: low <= nextHigh ? [low, nextHigh] : null,
          description: `${value} is bigger than the target ${target}, so the target can only be on the left. Discard the right half.`,
        }),
      )
      high = nextHigh
    } else {
      const nextLow = mid + 1
      frames.push(
        frame({
          low,
          high,
          mid,
          possible: nextLow <= high ? [nextLow, high] : null,
          description: `${value} is smaller than the target ${target}, so the target can only be on the right. Discard the left half.`,
        }),
      )
      low = nextLow
    }
  }

  frames.push(
    frame({
      low: null,
      high: null,
      mid: null,
      possible: null,
      result: -1,
      description: "Nothing left to check. The target isn't in the array, so the answer is -1.",
    }),
  )
  return frames
}
