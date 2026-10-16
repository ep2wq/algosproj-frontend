// Pure function for the permutations lesson: choose, explore, undo with a used marker per
// item. Each call either is a base case (cur holds every item: print it) or tries the items in
// the order given, skipping the used ones. With the items 1 to n in increasing order, as in the
// problem, the output comes out in lexicographic order. The player only reads these.

import type { CallNode } from './callTree'

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

function joinAnd(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// Expects 1 or more distinct items.
export function permutationFrames(items: string[]): { tree: CallNode[]; frames: PermFrame[] } {
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
  const names = (indexes: number[]) => joinAnd(indexes.map((i) => items[i]))

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
      push('print', null, [], `Base case: cur holds all ${n} items, so print ${line}. Printed so far: ${results.length} of ${n}! = ${total}.`)
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
      const skipText = unnamed.length === 0 ? '' : `Skip ${names(unnamed)}: already used. `
      const then = cur.length === n ? 'cur is full: a base case.' : `It fills position ${cur.length + 1}.`
      push('choose', i, unnamed, `${skipText}Choose ${items[i]}: mark it used and append it, cur = ${show(cur)}. Explore: call again, at depth ${cur.length}. ${then}`)
      unnamed = []
      explore()
      stack.pop()
      cur.pop()
      used[i] = false

      // Say what comes next: the next free item, or that this call is done.
      let next = i + 1
      const passed: number[] = []
      while (next < n && used[next]) passed.push(next++)
      const skipText2 = passed.length === 0 ? '' : ` Skip ${names(passed)}: ${passed.length === 1 ? 'it is' : 'they are'} still used.`
      const after =
        next < n
          ? `${skipText2} Next, try ${items[next]}.`
          : stack.length === 1
            ? `${skipText2} The first call has tried every item: the search is over.`
            : `${skipText2} No item is left to try at this depth, so this call returns to depth ${cur.length - 1}.`
      push('undo', i, passed, `Back at depth ${cur.length}. Undo: pop ${items[i]} and clear its mark, cur = ${show(cur)}.${after}`)
    }
  }

  call(null)
  push(
    'start',
    null,
    [],
    `Call with cur empty and nothing used, at depth 0. Each call fills the next position, trying the items in the order given: ${items.join(', ')}.`,
  )
  explore()
  stack.pop()
  push('done', null, [], `Done: ${n}! = ${total} permutations from ${tree.length} calls. They come out in the order the items were tried at every position.`)
  return { tree, frames }
}
