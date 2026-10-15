// Pure function for the binary strings lesson: the recursion with choose, explore, undo. Each
// call either is a base case (cur has n characters: print it) or tries 0, then 1, for the next
// position. The problem keeps every string, so no branch is ever pruned. The player only reads
// these.

import type { CallNode } from './callTree'

export type BinaryKind = 'start' | 'choose' | 'print' | 'undo' | 'done'

export type BinaryFrame = {
  kind: BinaryKind
  shown: number // calls made so far: tree[0..shown)
  stack: number[] // the open calls, root first; the last one is running (empty at the end)
  printed: number[] // ids of the base cases that have printed, in print order
  cur: string // the characters chosen so far
  depth: number | null // depth of the running call (the root is 0)
  position: number | null // the position the running call decides (1-based), or null at a base case
  results: string[]
  description: string
}

export function binaryStringFrames(n: number): { tree: CallNode[]; frames: BinaryFrame[] } {
  const tree: CallNode[] = []
  const frames: BinaryFrame[] = []
  const stack: number[] = []
  const printed: number[] = []
  const results: string[] = []
  const total = 2 ** n

  function push(kind: BinaryKind, cur: string, description: string) {
    frames.push({
      kind,
      shown: tree.length,
      stack: [...stack],
      printed: [...printed],
      cur,
      depth: stack.length === 0 ? null : stack.length - 1,
      position: stack.length === 0 || cur.length === n ? null : cur.length + 1,
      results: [...results],
      description,
    })
  }

  function call(cur: string, parent: number | null) {
    const id = tree.length
    tree.push({ id, parent, label: cur === '' ? '""' : cur, depth: cur.length })
    stack.push(id)
    return id
  }

  function explore(cur: string) {
    const id = stack[stack.length - 1]
    if (cur.length === n) {
      results.push(cur)
      printed.push(id)
      push('print', cur, `Base case: "${cur}" has n = ${n} characters, so print it. Printed so far: ${results.length} of 2^${n} = ${total}.`)
      return
    }
    const position = cur.length + 1
    for (const bit of ['0', '1']) {
      const next = cur + bit
      call(next, id)
      const then =
        next.length === n ? `"${next}" has ${n} characters: a base case.` : `It decides position ${position + 1}, trying 0 first.`
      push('choose', next, `Choose ${bit} for position ${position}: cur = "${next}". Explore: call again, at depth ${next.length}. ${then}`)
      explore(next)
      stack.pop()
      const after =
        bit === '0'
          ? `Now try 1 for position ${position}.`
          : stack.length === 1
            ? 'Both choices for position 1 are done: the first call returns, and the search is over.'
            : `Both choices for position ${position} are done, so this call returns to depth ${cur.length - 1}.`
      push('undo', cur, `Back at depth ${cur.length}. Undo: pop the ${bit}, cur = "${cur}". ${after}`)
    }
  }

  call('', null)
  push(
    'start',
    '',
    n === 1
      ? 'Call with cur = "" at depth 0. n = 1, so this call decides position 1: try 0, then 1.'
      : `Call with cur = "" at depth 0. n = ${n}, so there are ${n} positions to fill. This call decides position 1: try 0, then 1.`,
  )
  explore('')
  stack.pop()
  push(
    'done',
    '',
    `Done: ${total} strings, printed in increasing order because 0 is tried before 1. That took 2^${n + 1} - 1 = ${tree.length} calls, one per box in the tree.`,
  )
  return { tree, frames }
}
