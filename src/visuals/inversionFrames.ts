// Pure function for counting inversions with merge sort: count while you merge.
// The player only reads these.

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

function list(values: number[]) {
  if (values.length === 1) return `${values[0]} is`
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]} are`
}

export function inversionFrames(input: number[]): InversionFrame[] {
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

  if (a.length === 0) return [frame({ done: true, description: 'There are no numbers, so there are no pairs: 0 inversions.' })]
  if (a.length === 1) return [frame({ done: true, description: 'A single number has no pairs: 0 inversions.' })]

  const frames = [
    frame({ description: 'Merge sort splits the array into halves, sorts each half, and counts inversions while it merges them.' }),
  ]

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

    frames.push(at(null, `Merge ${left.join(' ')} with ${right.join(' ')}. Both halves are sorted.`))
    while (i < left.length || j < right.length) {
      if (j === right.length || (i < left.length && left[i] <= right[j])) {
        // Take from the left, also on a tie: equal values are not an inversion.
        const tie = j < right.length && left[i] === right[j]
        const value = left[i]
        merged.push(value)
        i++
        const note = tie ? ` It equals the ${value} on the right. Equal values are not an inversion, so take the left one and add nothing.` : ''
        frames.push(at('left', `Take ${value} from the left half.${note}`))
      } else {
        const waiting = left.slice(i)
        const value = right[j]
        merged.push(value)
        j++
        total += waiting.length
        const note =
          waiting.length === 0
            ? 'Nothing is waiting on the left, so add nothing.'
            : `${list(waiting)} still waiting on the left, so add ${waiting.length}. Total ${total}.`
        frames.push(at('right', `Take ${value} from the right half. ${note}`))
      }
    }

    for (let k = 0; k < merged.length; k++) a[start + k] = merged[k]
    frames.push(at(null, `Write ${merged.join(' ')} back. This merge added ${total - before}. Total ${total}.`))
  }

  sort(0, a.length)
  frames.push(frame({ done: true, description: `Done: the array is sorted, and the total is ${total} ${total === 1 ? 'inversion' : 'inversions'}.` }))
  return frames
}
