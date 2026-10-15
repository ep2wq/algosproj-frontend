// Pure function for counting connected components, as in the lesson: adjacency lists, a
// visited mark, and a stack. Loop over the nodes 1 to n; each unvisited one starts a walk.
// The player only reads these.

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
  return list.length === 0 ? 'empty' : `[${list.join(', ')}]`
}

function joinAnd(items: (string | number)[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// Expects 1 <= u, v <= n for every edge.
export function componentsFrames(n: number, edges: [number, number][]): ComponentsFrame[] {
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

  const shownLists = Array.from({ length: n }, (_, i) => `${i + 1}: ${listText(lists[i + 1])}`).join(', ')
  const frames = [frame({ description: `n = ${n}. The lists are ${shownLists}. Loop over the nodes 1 to ${n}, with count = 0.` })]

  for (let start = 1; start <= n; start++) {
    if (component[start] !== null) {
      frames.push(frame({ checked: start, description: `Node ${start} is visited: skip it.` }))
      continue
    }
    count++
    component[start] = count
    stack.push(start)
    frames.push(frame({ checked: start, pushed: [start], description: `Node ${start} is not visited: count = ${count}. Mark it and push it on the stack.` }))

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
      let text: string
      if (lists[node].length === 0) text = 'Its list is empty, so there is nothing to push.'
      else if (pushed.length === 0) text = `Its list is ${listText(lists[node])}, and all of them are visited, so nothing is pushed.`
      else {
        const already = seen.length > 0 ? ` ${joinAnd(seen)} ${seen.length === 1 ? 'is' : 'are'} already visited.` : ''
        text = `Its list is ${listText(lists[node])}. Mark and push ${joinAnd(pushed)}.${already}`
      }
      const done = stack.length === 0 ? ` The stack is empty, so the walk is done: it visited ${joinAnd([...walk].sort((a, b) => a - b))}.` : ''
      frames.push(frame({ checked: start, current: node, pushed, description: `Pop ${node}. ${text}${done}` }))
    }
  }

  frames.push(frame({ output: String(count), description: `All ${n === 1 ? '1 node is' : `${n} nodes are`} checked. Print ${count}.` }))
  return frames
}
