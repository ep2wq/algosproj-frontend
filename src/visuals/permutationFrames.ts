// Pure function for the permutations lesson: choose, explore, undo with a used marker per
// item. Each call either is a base case (cur holds every item: print it) or tries the items in
// the order given, skipping the used ones. With the items 1 to n in increasing order, as in the
// problem, the output comes out in lexicographic order. The player only reads these.

import type { CallNode } from './callTree'
import { joinAnd, value, type T } from './i18n'

export type PermKind = 'start' | 'choose' | 'print' | 'undo' | 'done'

export type PermFrame = {
  kind: PermKind
  shown: number // calls made so far: tree[0..shown)
  stack: number[] // the open calls, root first; the last one is running (empty at the end)
  printed: number[] // ids of the base cases that have printed, in print order
  cur: number[] // indexes of the items placed so far
  used: boolean[] // one marker per item
  depth: number | null // depth of the running call (the root is 0)
  focus: number | null // the item chosen or undone in this step
  skipped: number[] // items named as skipped (already used) in this step
  results: string[] // printed lines: the items separated by single spaces
  description: string
}

// Expects 1 or more distinct items.
export function permutationFrames(items: string[], t: T): { tree: CallNode[]; frames: PermFrame[] } {
  const n = items.length
  const tree: CallNode[] = []
  const frames: PermFrame[] = []
  const stack: number[] = []
  const printed: number[] = []
  const results: string[] = []
  const used = items.map(() => false)
  const cur: number[] = []
  let total = 1
  for (let k = 2; k <= n; k++) total *= k

  const show = (indexes: number[]) => `[${indexes.map((i) => items[i]).join(', ')}]`
  const names = (indexes: number[]) => joinAnd(t, indexes.map((i) => value(t, items[i])))

  function push(kind: PermKind, focus: number | null, skipped: number[], description: string) {
    frames.push({
      kind,
      shown: tree.length,
      stack: [...stack],
      printed: [...printed],
      cur: [...cur],
      used: [...used],
      depth: stack.length === 0 ? null : stack.length - 1,
      focus,
      skipped: [...skipped],
      results: [...results],
      description,
    })
  }

  function call(parent: number | null) {
    const id = tree.length
    tree.push({ id, parent, label: cur.length === 0 ? '[]' : cur.map((i) => items[i]).join(''), depth: cur.length })
    stack.push(id)
  }

  function explore() {
    const id = stack[stack.length - 1]
    if (cur.length === n) {
      const line = cur.map((i) => items[i]).join(' ')
      results.push(line)
      printed.push(id)
      push('print', null, [], t('permutations.print', { n, line, printed: results.length, total }))
      return
    }
    // Skips not yet named in a step's text: the used items passed before the first choice.
    let unnamed: number[] = []
    for (let i = 0; i < n; i++) {
      if (used[i]) {
        unnamed.push(i)
        continue
      }
      used[i] = true
      cur.push(i)
      call(id)
      const parts = unnamed.length === 0 ? [] : [t('permutations.skipUsed', { items: names(unnamed), count: unnamed.length })]
      parts.push(t('permutations.choose', { item: items[i], cur: show(cur), depth: cur.length }))
      parts.push(cur.length === n ? t('permutations.thenFull') : t('permutations.thenFills', { position: cur.length + 1 }))
      push('choose', i, unnamed, parts.join(' '))
      unnamed = []
      explore()
      stack.pop()
      cur.pop()
      used[i] = false

      // Say what comes next: the next free item, or that this call is done.
      let next = i + 1
      const passed: number[] = []
      while (next < n && used[next]) passed.push(next++)
      const undoParts = [t('permutations.undo', { depth: cur.length, item: items[i], cur: show(cur) })]
      if (passed.length > 0) undoParts.push(t('permutations.stillUsed', { items: names(passed), count: passed.length }))
      undoParts.push(
        next < n
          ? t('permutations.nextTry', { item: items[next] })
          : stack.length === 1
            ? t('permutations.searchOver')
            : t('permutations.returns', { depth: cur.length - 1 }),
      )
      push('undo', i, passed, undoParts.join(' '))
    }
  }

  call(null)
  push(
    'start',
    null,
    [],
    t('permutations.start', { items: items.join(', ') }),
  )
  explore()
  stack.pop()
  push('done', null, [], t('permutations.done', { n, total, calls: tree.length }))
  return { tree, frames }
}
