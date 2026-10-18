// Pure function for the binary strings lesson: the recursion with choose, explore, undo. Each
// call either is a base case (cur has n characters: print it) or tries 0, then 1, for the next
// position. The problem keeps every string, so no branch is ever pruned. The player only reads
// these.

import type { CallNode } from './callTree'
import type { T } from './i18n'

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

export function binaryStringFrames(n: number, t: T): { tree: CallNode[]; frames: BinaryFrame[] } {
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
      push('print', cur, t('binaryString.print', { cur, n, printed: results.length, total }))
      return
    }
    const position = cur.length + 1
    for (const bit of ['0', '1']) {
      const next = cur + bit
      call(next, id)
      const params = { bit, position, next, depth: next.length, n, nextPosition: position + 1 }
      push('choose', next, next.length === n ? t('binaryString.chooseBase', params) : t('binaryString.chooseDecide', params))
      explore(next)
      stack.pop()
      const after =
        bit === '0'
          ? t('binaryString.tryOne', { position })
          : stack.length === 1
            ? t('binaryString.searchOver')
            : t('binaryString.returns', { position, depth: cur.length - 1 })
      push('undo', cur, `${t('binaryString.undo', { depth: cur.length, bit, cur })} ${after}`)
    }
  }

  call('', null)
  push(
    'start',
    '',
    n === 1 ? t('binaryString.startOne') : t('binaryString.start', { n }),
  )
  explore('')
  stack.pop()
  push(
    'done',
    '',
    t('binaryString.done', { total, power: n + 1, calls: tree.length }),
  )
  return { tree, frames }
}
