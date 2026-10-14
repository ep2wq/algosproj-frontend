// Pure functions that turn an array into a list of frames, one per step of a sort.
// The player only reads these; there is no animation logic here.

export type Frame = {
  array: number[]
  compared: number[] // indices being compared
  changed: number[] // indices swapped or written in this step
  sorted: number[] // indices already in their final position
  description: string
}

function frame(array: number[], description: string, parts: Partial<Omit<Frame, 'array' | 'description'>> = {}): Frame {
  return {
    array: [...array],
    compared: [...(parts.compared ?? [])],
    changed: [...(parts.changed ?? [])],
    sorted: [...(parts.sorted ?? [])],
    description,
  }
}

function allIndices(array: number[]) {
  return array.map((_, index) => index)
}

// Frames for arrays too short to need any work. Returns null if there is work to do.
function trivialFrames(array: number[]): Frame[] | null {
  if (array.length === 0) return [frame(array, 'The array is empty, so there is nothing to sort.')]
  if (array.length === 1) return [frame(array, 'A single number is already sorted.', { sorted: [0] })]
  return null
}

function doneFrame(array: number[]) {
  return frame(array, 'Done: the array is sorted.', { sorted: allIndices(array) })
}

export function bubbleSortFrames(input: number[]): Frame[] {
  const trivial = trivialFrames(input)
  if (trivial) return trivial

  const a = [...input]
  const sorted: number[] = []
  const frames = [frame(a, 'Bubble sort walks through the array and swaps neighbours that are in the wrong order.')]

  for (let pass = 0; pass < a.length - 1; pass++) {
    let swapped = false
    const end = a.length - 1 - pass
    for (let j = 0; j < end; j++) {
      const left = a[j]
      const right = a[j + 1]
      if (left > right) {
        frames.push(frame(a, `Compare ${left} and ${right}: ${left} is bigger, so swap them.`, { compared: [j, j + 1], sorted }))
        a[j] = right
        a[j + 1] = left
        swapped = true
        frames.push(frame(a, `Swapped: ${right} now comes before ${left}.`, { changed: [j, j + 1], sorted }))
      } else {
        frames.push(
          frame(a, `Compare ${left} and ${right}: ${left} is not bigger, so leave them.`, { compared: [j, j + 1], sorted }),
        )
      }
    }
    if (!swapped) {
      frames.push(frame(a, 'No swaps in this pass, so everything is in order.', { sorted: allIndices(a) }))
      break
    }
    sorted.push(end)
    frames.push(frame(a, `${a[end]} has bubbled up to its final place.`, { sorted }))
  }

  frames.push(doneFrame(a))
  return frames
}

export function insertionSortFrames(input: number[]): Frame[] {
  const trivial = trivialFrames(input)
  if (trivial) return trivial

  const a = [...input]
  const frames = [frame(a, 'Insertion sort takes each number in turn and moves it left until it fits.')]

  for (let i = 1; i < a.length; i++) {
    frames.push(frame(a, `Take ${a[i]} and insert it into the part on its left.`, { compared: [i] }))
    for (let j = i; j > 0; j--) {
      const left = a[j - 1]
      const current = a[j]
      if (left > current) {
        frames.push(frame(a, `Compare ${left} and ${current}: ${left} is bigger, so swap them.`, { compared: [j - 1, j] }))
        a[j - 1] = current
        a[j] = left
        frames.push(frame(a, `Swapped: ${current} moves one place left.`, { changed: [j - 1, j] }))
      } else {
        frames.push(
          frame(a, `Compare ${left} and ${current}: ${left} is not bigger, so ${current} stays here.`, {
            compared: [j - 1, j],
          }),
        )
        break
      }
    }
  }

  frames.push(doneFrame(a))
  return frames
}

export function mergeSortFrames(input: number[]): Frame[] {
  const trivial = trivialFrames(input)
  if (trivial) return trivial

  const a = [...input]
  const frames = [frame(a, 'Merge sort splits the array into halves, sorts each half, then merges them back together.')]

  function sort(start: number, end: number) {
    // Sorts a[start..end), end exclusive.
    if (end - start < 2) return
    const mid = Math.floor((start + end) / 2)
    sort(start, mid)
    sort(mid, end)

    const leftPart = a.slice(start, mid)
    const rightPart = a.slice(mid, end)
    frames.push(frame(a, `Merge ${leftPart.join(' ')} with ${rightPart.join(' ')}.`))

    // Compare the front of each half. The array isn't touched until the merged result is written back.
    const merged: number[] = []
    let i = 0
    let j = 0
    while (i < leftPart.length && j < rightPart.length) {
      const left = leftPart[i]
      const right = rightPart[j]
      const compared = [start + i, mid + j]
      if (left <= right) {
        frames.push(frame(a, `Compare ${left} and ${right}: ${left} is not bigger, so ${left} goes next.`, { compared }))
        merged.push(left)
        i++
      } else {
        frames.push(frame(a, `Compare ${left} and ${right}: ${right} is smaller, so ${right} goes next.`, { compared }))
        merged.push(right)
        j++
      }
    }
    merged.push(...leftPart.slice(i), ...rightPart.slice(j))

    for (let k = 0; k < merged.length; k++) a[start + k] = merged[k]
    const changed = merged.map((_, k) => start + k)
    frames.push(frame(a, `Write the merged numbers back: ${merged.join(' ')}.`, { changed }))
  }

  sort(0, a.length)
  frames.push(doneFrame(a))
  return frames
}
