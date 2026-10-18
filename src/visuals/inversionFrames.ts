// Pure function for counting inversions with merge sort: count while you merge.
// The player only reads these.

import { joinAnd, value, type T } from './i18n'

export type InversionFrame = {
  array: number[] // merged ranges are written back after each merge
  range: [number, number] | null // the range being merged, start inclusive, end exclusive
  left: number[] // the sorted left run of that range
  right: number[] // the sorted right run
  leftPointer: number // next position to take in the left run
  rightPointer: number
  merged: number[] // the merged output so far
  took: 'left' | 'right' | null // which run the last merged number came from
  total: number // inversions so far
  done: boolean
  description: string
}

export function inversionFrames(input: number[], t: T): InversionFrame[] {
  const a = [...input]
  let total = 0
  const frame = (parts: Partial<Omit<InversionFrame, 'array' | 'total' | 'description'>> & { description: string }): InversionFrame => ({
    array: [...a],
    range: parts.range ? [...parts.range] : null,
    left: [...(parts.left ?? [])],
    right: [...(parts.right ?? [])],
    leftPointer: parts.leftPointer ?? 0,
    rightPointer: parts.rightPointer ?? 0,
    merged: [...(parts.merged ?? [])],
    took: parts.took ?? null,
    total,
    done: parts.done ?? false,
    description: parts.description,
  })

  if (a.length === 0) return [frame({ done: true, description: t('inversions.empty') })]
  if (a.length === 1) return [frame({ done: true, description: t('inversions.single') })]

  const frames = [frame({ description: t('inversions.intro') })]

  // Sorts a[start..end) and adds the inversions inside it to total.
  function sort(start: number, end: number) {
    if (end - start < 2) return
    const mid = Math.floor((start + end) / 2)
    sort(start, mid)
    sort(mid, end)

    const range: [number, number] = [start, end]
    const left = a.slice(start, mid)
    const right = a.slice(mid, end)
    const merged: number[] = []
    const before = total
    let i = 0
    let j = 0
    const at = (took: 'left' | 'right' | null, description: string) =>
      frame({ range, left, right, leftPointer: i, rightPointer: j, merged, took, description })

    frames.push(at(null, t('inversions.mergeStart', { left: left.join(' '), right: right.join(' ') })))
    while (i < left.length || j < right.length) {
      if (j === right.length || (i < left.length && left[i] <= right[j])) {
        // Take from the left, also on a tie: equal values are not an inversion.
        const tie = j < right.length && left[i] === right[j]
        const taken = left[i]
        merged.push(taken)
        i++
        frames.push(at('left', tie ? t('inversions.takeLeftTie', { value: taken }) : t('inversions.takeLeft', { value: taken })))
      } else {
        const waiting = left.slice(i)
        const taken = right[j]
        merged.push(taken)
        j++
        total += waiting.length
        const note =
          waiting.length === 0
            ? t('inversions.nothingWaiting')
            : t('inversions.waiting', { values: joinAnd(t, waiting.map((item) => value(t, item))), count: waiting.length, total })
        frames.push(at('right', `${t('inversions.takeRight', { value: taken })} ${note}`))
      }
    }

    for (let k = 0; k < merged.length; k++) a[start + k] = merged[k]
    frames.push(at(null, t('inversions.writeBack', { merged: merged.join(' '), added: total - before, total })))
  }

  sort(0, a.length)
  frames.push(frame({ done: true, description: t('inversions.done', { count: total }) }))
  return frames
}
