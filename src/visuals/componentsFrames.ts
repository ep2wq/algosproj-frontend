// Pure function for counting connected components, as in the lesson: adjacency lists, a
// visited mark, and a stack. Loop over the nodes 1 to n; each unvisited one starts a walk.
// The player only reads these.

import { joinAnd, value, type T } from './i18n'

export type ComponentsFrame = {
  n: number
  edges: [number, number][]
  lists: number[][] // lists[u] = neighbours of u in edge order; lists[0] is unused
  component: (number | null)[] // component[u] = the walk that marked u, or null if unvisited
  checked: number | null // node the outer loop is looking at
  current: number | null // node just popped
  stack: number[] // bottom first, top last
  pushed: number[] // nodes marked and pushed in this step
  count: number
  output: string | null
  description: string
}

function listText(list: number[]) {
  return `[${list.join(', ')}]`
}

// Expects 1 <= u, v <= n for every edge.
export function componentsFrames(n: number, edges: [number, number][], t: T): ComponentsFrame[] {
  const and = (items: number[]) => joinAnd(t, items.map((item) => value(t, item)))
  const lists: number[][] = Array.from({ length: n + 1 }, () => [])
  for (const [u, v] of edges) {
    lists[u].push(v)
    lists[v].push(u)
  }
  const component: (number | null)[] = Array.from({ length: n + 1 }, () => null)
  const stack: number[] = []
  let count = 0
  const frame = (parts: { checked?: number; current?: number; pushed?: number[]; output?: string; description: string }): ComponentsFrame => ({
    n,
    edges: edges.map(([u, v]) => [u, v]),
    lists: lists.map((list) => [...list]),
    component: [...component],
    checked: parts.checked ?? null,
    current: parts.current ?? null,
    stack: [...stack],
    pushed: [...(parts.pushed ?? [])],
    count,
    output: parts.output ?? null,
    description: parts.description,
  })

  const shownLists = Array.from({ length: n }, (_, i) =>
    lists[i + 1].length === 0 ? t('components.listEntryEmpty', { node: i + 1 }) : t('components.listEntry', { node: i + 1, list: listText(lists[i + 1]) }),
  ).join(t('common.listSeparator'))
  const frames = [frame({ description: t('components.start', { n, lists: shownLists }) })]

  for (let start = 1; start <= n; start++) {
    if (component[start] !== null) {
      frames.push(frame({ checked: start, description: t('components.visited', { node: start }) }))
      continue
    }
    count++
    component[start] = count
    stack.push(start)
    frames.push(frame({ checked: start, pushed: [start], description: t('components.startWalk', { node: start, value: count }) }))

    const walk = [start]
    while (stack.length > 0) {
      const node = stack.pop()!
      const pushed: number[] = []
      for (const next of lists[node]) {
        if (component[next] === null) {
          component[next] = count
          stack.push(next)
          pushed.push(next)
          walk.push(next)
        }
      }
      const seen = [...new Set(lists[node].filter((next) => !pushed.includes(next)))]
      const parts = [t('components.pop', { node })]
      if (lists[node].length === 0) parts.push(t('components.listEmpty'))
      else if (pushed.length === 0) parts.push(t('components.allVisited', { list: listText(lists[node]) }))
      else {
        parts.push(t('components.markPush', { list: listText(lists[node]), pushed: and(pushed) }))
        if (seen.length > 0) parts.push(t('components.alreadyVisited', { nodes: and(seen), count: seen.length }))
      }
      if (stack.length === 0) parts.push(t('components.walkDone', { nodes: and([...walk].sort((a, b) => a - b)) }))
      frames.push(frame({ checked: start, current: node, pushed, description: parts.join(' ') }))
    }
  }

  frames.push(frame({ output: String(count), description: t('components.allChecked', { count: n, result: count }) }))
  return frames
}
