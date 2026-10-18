// Pure functions that turn an array into a list of frames, one per step of a sort.
// The player only reads these; there is no animation logic here.

import type { T } from './i18n'

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
function trivialFrames(array: number[], t: T): Frame[] | null {
  if (array.length === 0) return [frame(array, t('sorting.empty'))]
  if (array.length === 1) return [frame(array, t('sorting.single'), { sorted: [0] })]
  return null
}

function doneFrame(array: number[], t: T) {
  return frame(array, t('sorting.done'), { sorted: allIndices(array) })
}

export function bubbleSortFrames(input: number[], t: T): Frame[] {
  const trivial = trivialFrames(input, t)
  if (trivial) return trivial

  const a = [...input]
  const sorted: number[] = []
  const frames = [frame(a, t('sorting.bubbleIntro'))]

  for (let pass = 0; pass < a.length - 1; pass++) {
    let swapped = false
    const end = a.length - 1 - pass
    for (let j = 0; j < end; j++) {
      const left = a[j]
      const right = a[j + 1]
      if (left > right) {
        frames.push(frame(a, t('sorting.compareSwap', { left, right }), { compared: [j, j + 1], sorted }))
        a[j] = right
        a[j + 1] = left
        swapped = true
        frames.push(frame(a, t('sorting.swapped', { left, right }), { changed: [j, j + 1], sorted }))
      } else {
        frames.push(
          frame(a, t('sorting.compareLeave', { left, right }), { compared: [j, j + 1], sorted }),
        )
      }
    }
    if (!swapped) {
      frames.push(frame(a, t('sorting.noSwaps'), { sorted: allIndices(a) }))
      break
    }
    sorted.push(end)
    frames.push(frame(a, t('sorting.bubbled', { value: a[end] }), { sorted }))
  }

  frames.push(doneFrame(a, t))
  return frames
}

export function insertionSortFrames(input: number[], t: T): Frame[] {
  const trivial = trivialFrames(input, t)
  if (trivial) return trivial

  const a = [...input]
  const frames = [frame(a, t('sorting.insertionIntro'))]

  for (let i = 1; i < a.length; i++) {
    frames.push(frame(a, t('sorting.take', { value: a[i] }), { compared: [i] }))
    for (let j = i; j > 0; j--) {
      const left = a[j - 1]
      const current = a[j]
      if (left > current) {
        frames.push(frame(a, t('sorting.compareSwap', { left, right: current }), { compared: [j - 1, j] }))
        a[j - 1] = current
        a[j] = left
        frames.push(frame(a, t('sorting.movesLeft', { value: current }), { changed: [j - 1, j] }))
      } else {
        frames.push(
          frame(a, t('sorting.compareStays', { left, right: current }), {
            compared: [j - 1, j],
          }),
        )
        break
      }
    }
  }

  frames.push(doneFrame(a, t))
  return frames
}

export function mergeSortFrames(input: number[], t: T): Frame[] {
  const trivial = trivialFrames(input, t)
  if (trivial) return trivial

  const a = [...input]
  const frames = [frame(a, t('sorting.mergeIntro'))]

  function sort(start: number, end: number) {
    // Sorts a[start..end), end exclusive.
    if (end - start < 2) return
    const mid = Math.floor((start + end) / 2)
    sort(start, mid)
    sort(mid, end)

    const leftPart = a.slice(start, mid)
    const rightPart = a.slice(mid, end)
    frames.push(frame(a, t('sorting.merge', { left: leftPart.join(' '), right: rightPart.join(' ') })))

    // Compare the front of each half. The array isn't touched until the merged result is written back.
    const merged: number[] = []
    let i = 0
    let j = 0
    while (i < leftPart.length && j < rightPart.length) {
      const left = leftPart[i]
      const right = rightPart[j]
      const compared = [start + i, mid + j]
      if (left <= right) {
        frames.push(frame(a, t('sorting.leftNext', { left, right }), { compared }))
        merged.push(left)
        i++
      } else {
        frames.push(frame(a, t('sorting.rightNext', { left, right }), { compared }))
        merged.push(right)
        j++
      }
    }
    merged.push(...leftPart.slice(i), ...rightPart.slice(j))

    for (let k = 0; k < merged.length; k++) a[start + k] = merged[k]
    const changed = merged.map((_, k) => start + k)
    frames.push(frame(a, t('sorting.writeBack', { merged: merged.join(' ') }), { changed }))
  }

  sort(0, a.length)
  frames.push(doneFrame(a, t))
  return frames
}
