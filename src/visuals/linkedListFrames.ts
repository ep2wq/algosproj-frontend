// Pure functions for three linked list algorithms: reversing a list, finding its middle node
// and detecting a cycle. Nodes are numbered 0..n-1 in input order and keep their place on
// screen; only the next pointers change. The player only reads these.

export type ListMode = 'reverse' | 'middle' | 'cycle'

// Where a pointer variable points: a node index, or null. Null is drawn at the left end
// (reverse: prev starts there and node 0 ends up pointing there) or at the right end.
export type Target = number | 'null-left' | 'null-right'

export type ListPointer = { name: string; at: Target }

export type ListFrame = {
  values: number[]
  next: (number | null)[] // next[i] = index of the node after node i, or null
  flipped: boolean[] // reverse: node i's next already points back
  leftNull: boolean // reverse only: draw the null at the left end
  pointers: ListPointer[]
  changed: number | null // node whose next was reassigned in this step
  highlight: number | null // the middle node, or the node where slow and fast meet
  output: string | null // the printed line, shown when finished
  description: string
}

function frameMaker(values: number[], next: (number | null)[], flipped: boolean[], leftNull: boolean) {
  return (parts: { pointers: ListPointer[]; description: string; changed?: number; highlight?: number; output?: string }): ListFrame => ({
    values: [...values],
    next: [...next],
    flipped: [...flipped],
    leftNull,
    pointers: parts.pointers.map((pointer) => ({ ...pointer })),
    changed: parts.changed ?? null,
    highlight: parts.highlight ?? null,
    output: parts.output ?? null,
    description: parts.description,
  })
}

// "the node with 7 (index 2)" or "null".
function describe(values: number[], at: number | null) {
  return at === null ? 'null' : `the node with ${values[at]} (index ${at})`
}

function straightList(n: number) {
  return Array.from({ length: n }, (_, i) => (i + 1 < n ? i + 1 : null))
}

export function reverseFrames(values: number[]): ListFrame[] {
  const n = values.length
  const next = straightList(n)
  const flipped = values.map(() => false)
  const frame = frameMaker(values, next, flipped, n > 0)

  if (n === 0) {
    return [
      frame({
        pointers: [{ name: 'head', at: 'null-right' }],
        output: '',
        description: 'The list is empty: head is null, so the loop never runs. Print an empty line.',
      }),
    ]
  }

  const at = (i: number | null, side: 'null-left' | 'null-right'): Target => (i === null ? side : i)
  let prev: number | null = null
  let curr: number | null = 0
  let saved: number | null = null
  const pointers = (withNext: boolean) => [
    { name: 'prev', at: at(prev, 'null-left') },
    { name: 'curr', at: at(curr, 'null-right') },
    ...(withNext ? [{ name: 'next', at: at(saved, 'null-right') }] : []),
  ]

  const frames = [
    frame({
      pointers: [{ name: 'head', at: 0 }, ...pointers(false)],
      description: `Start with prev = null and curr = head, ${describe(values, 0)}.`,
    }),
  ]

  while (curr !== null) {
    const c: number = curr
    saved = next[c]
    frames.push(frame({ pointers: pointers(true), description: `Save next = curr.next, which is ${describe(values, saved)}.` }))

    next[c] = prev
    flipped[c] = true
    frames.push(
      frame({
        pointers: pointers(true),
        changed: c,
        description: `Point curr.next back at prev: ${describe(values, c)} now points to ${describe(values, prev)}.`,
      }),
    )

    prev = c
    curr = saved
    frames.push(
      frame({
        pointers: pointers(true),
        description: `Move prev forward to ${describe(values, prev)} and curr forward to ${describe(values, curr)}.`,
      }),
    )
  }

  const reversed: number[] = []
  for (let node: number | null = prev; node !== null; node = next[node]) reversed.push(values[node])
  frames.push(
    frame({
      pointers: [{ name: 'head', at: prev! }, ...pointers(true)],
      output: reversed.join(' '),
      description: `curr is null, so the loop stops. prev, ${describe(values, prev)}, is the new head. Walk from it and print ${reversed.join(' ')}.`,
    }),
  )
  return frames
}

function slowFast(slow: number | null, fast: number | null): ListPointer[] {
  return [
    { name: 'slow', at: slow ?? 'null-right' },
    { name: 'fast', at: fast ?? 'null-right' },
  ]
}

// Expects 1 or more values. For an even n, slow stops on the second middle node.
export function middleFrames(values: number[]): ListFrame[] {
  const n = values.length
  const next = straightList(n)
  const frame = frameMaker(values, next, values.map(() => false), false)
  let slow = 0
  let fast: number | null = 0
  const frames = [frame({ pointers: slowFast(slow, fast), description: `slow and fast both start at the head, ${describe(values, 0)}.` })]

  while (fast !== null && next[fast] !== null) {
    slow = next[slow]!
    fast = next[next[fast]!]
    frames.push(
      frame({
        pointers: slowFast(slow, fast),
        description: `fast and fast.next are not null, so slow moves one node to ${values[slow]} and fast moves two, to ${describe(values, fast)}.`,
      }),
    )
  }

  const why = fast === null ? 'fast is null' : `fast.next is null (fast is on the last node, ${values[fast]})`
  const which = n % 2 === 0 ? `n = ${n} is even, so this is the second of the two middle nodes` : 'this is the middle node'
  frames.push(
    frame({
      pointers: slowFast(slow, fast),
      highlight: slow,
      output: String(values[slow]),
      description: `The loop stops because ${why}. slow is on index ${slow}; ${which}. Print ${values[slow]}.`,
    }),
  )
  return frames
}

// Expects -1 <= pos <= n - 1, and pos = -1 when n = 0.
export function cycleFrames(values: number[], pos: number): ListFrame[] {
  const n = values.length
  const next = straightList(n)
  if (pos >= 0) next[n - 1] = pos
  const frame = frameMaker(values, next, values.map(() => false), false)

  if (n === 0) {
    return [
      frame({
        pointers: slowFast(null, null),
        output: 'no',
        description: 'The list is empty: head is null, so fast is null and the loop never runs. No cycle. Print no.',
      }),
    ]
  }

  const link = pos >= 0 ? `The last node links back to ${describe(values, pos)}.` : 'The last node points to null.'
  let slow = 0
  let fast: number | null = 0
  const frames = [frame({ pointers: slowFast(slow, fast), description: `${link} slow and fast both start at the head.` })]

  // slow and fast meet within n moves when there is a cycle, and fast reaches null within
  // n / 2 moves when there isn't, so this bound is never the reason the loop ends.
  for (let moves = 0; moves < 2 * n + 2; moves++) {
    if (fast === null || next[fast] === null) {
      const why = fast === null ? 'fast is null' : 'fast.next is null'
      frames.push(
        frame({
          pointers: slowFast(slow, fast),
          output: 'no',
          description: `The loop stops because ${why}: fast reached the end of the list. No cycle. Print no.`,
        }),
      )
      return frames
    }
    slow = next[slow]!
    fast = next[next[fast]!]
    frames.push(
      frame({
        pointers: slowFast(slow, fast),
        description: `slow moves one node to ${values[slow]} (index ${slow}); fast moves two, to ${describe(values, fast)}.`,
      }),
    )
    if (slow === fast) {
      frames.push(
        frame({
          pointers: slowFast(slow, fast),
          highlight: slow,
          output: 'yes',
          description: `slow and fast are on the same node, ${describe(values, slow)}. There is a cycle. Print yes.`,
        }),
      )
      return frames
    }
  }
  throw new Error('cycleFrames: slow and fast neither met nor reached null')
}
