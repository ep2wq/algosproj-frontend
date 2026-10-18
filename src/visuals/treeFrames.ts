// Pure functions for the three binary search tree lessons. Each starts by inserting the values
// one by one into an empty tree, as the lessons do, one step per value, then runs that lesson's
// method on the finished tree: the height with a stack of (node, depth) pairs, the lowest
// common ancestor by walking down from the root, or deleting x with the successor rule.
// Nodes keep an id (insertion order) and a slot (their first value's place in sorted order),
// so a node never moves sideways. The player only reads these.

import { joinAnd, type T } from './i18n'

export type TreeMode = 'height' | 'lca' | 'delete'

export type TreeNode = { id: number; value: number; left: number | null; right: number | null; slot: number }

// How a node is drawn in one step: on the path walked so far, the node being looked at,
// a node in focus (the one just inserted, or the successor), or the answer.
export type Mark = 'path' | 'current' | 'focus' | 'answer'

export type TreeVar = { name: string; value: string }

export type TreeFrame = {
  slots: number // one column per input value
  nodes: TreeNode[] // the nodes in the tree now, by id
  root: number | null
  marks: { id: number; mark: Mark }[]
  edge: [number, number] | null // parent id, child id: the link used or changed in this step
  vars: TreeVar[]
  stack: string[] | null // height only: the (value, depth) pairs, bottom first
  output: string | null // the printed line, only in the last step
  description: string
}

type FrameParts = {
  marks?: { id: number; mark: Mark }[]
  edge?: [number, number]
  vars: TreeVar[]
  stack?: string[]
  output?: string
  description: string
}

function pathMarks(ids: number[]) {
  return ids.map((id) => ({ id, mark: 'path' as Mark }))
}

// Expects distinct values.
function makeTree(values: number[], t: T) {
  const sorted = [...values].sort((a, b) => a - b)
  const nodes: (TreeNode | null)[] = []
  const tree = { nodes, root: null as number | null }

  function node(id: number) {
    return nodes[id]!
  }

  function frame(parts: FrameParts): TreeFrame {
    return {
      slots: values.length,
      nodes: nodes.filter((n): n is TreeNode => n !== null).map((n) => ({ ...n })),
      root: tree.root,
      marks: (parts.marks ?? []).map((m) => ({ ...m })),
      edge: parts.edge ? [parts.edge[0], parts.edge[1]] : null,
      vars: parts.vars.map((v) => ({ ...v })),
      stack: parts.stack ? [...parts.stack] : null,
      output: parts.output ?? null,
      description: parts.description,
    }
  }

  // The build phase: one step per value, with the comparisons on the way down.
  function build(frames: TreeFrame[], vars: () => TreeVar[]) {
    frames.push(
      frame({
        vars: vars(),
        description:
          values.length === 0
            ? t('tree.noValues')
            : values.length === 1
              ? t('tree.insertOne', { value: values[0] })
              : t('tree.insertMany', { n: values.length, values: values.join(' ') }),
      }),
    )
    for (const [id, value] of values.entries()) {
      nodes[id] = { id, value, left: null, right: null, slot: sorted.indexOf(value) }
      if (tree.root === null) {
        tree.root = id
        frames.push(frame({ marks: [{ id, mark: 'focus' }], vars: vars(), description: t('tree.insertRoot', { value }) }))
        continue
      }
      const steps: string[] = []
      const path: number[] = []
      let cur = tree.root
      let side: 'left' | 'right'
      for (;;) {
        const c = node(cur)
        path.push(cur)
        if (value < c.value) {
          steps.push(t('tree.goLeft', { value, node: c.value }))
          if (c.left === null) {
            c.left = id
            side = 'left'
            break
          }
          cur = c.left
        } else {
          steps.push(t('tree.goRight', { value, node: c.value }))
          if (c.right === null) {
            c.right = id
            side = 'right'
            break
          }
          cur = c.right
        }
      }
      frames.push(
        frame({
          marks: [...pathMarks(path), { id, mark: 'focus' }],
          edge: [cur, id],
          vars: vars(),
          description: t(side === 'left' ? 'tree.placeLeft' : 'tree.placeRight', { value, steps: steps.join(t('tree.stepSeparator')), parent: node(cur).value }),
        }),
      )
    }
  }

  return { tree, node, frame, build }
}

function preorder(t: { nodes: (TreeNode | null)[]; root: number | null }) {
  const out: number[] = []
  const stack = t.root === null ? [] : [t.root]
  while (stack.length > 0) {
    const n = t.nodes[stack.pop()!]!
    out.push(n.value)
    if (n.right !== null) stack.push(n.right)
    if (n.left !== null) stack.push(n.left)
  }
  return out
}

// Height of a BST: push (root, 1); pop a pair, keep the largest depth seen, push each child
// with depth + 1.
export function heightFrames(values: number[], t: T): TreeFrame[] {
  const { tree, node, frame, build } = makeTree(values, t)
  let largest = 0
  const stack: [number, number][] = []
  const vars = () => [{ name: t('tree.largestDepth'), value: String(largest) }]
  const shownStack = () => stack.map(([id, depth]) => `(${node(id).value}, ${depth})`)
  const frames: TreeFrame[] = []
  build(frames, vars)

  if (tree.root === null) {
    frames.push(
      frame({
        vars: vars(),
        stack: [],
        output: '0',
        description: t('tree.heightEmpty'),
      }),
    )
    return frames
  }

  stack.push([tree.root, 1])
  frames.push(
    frame({
      vars: vars(),
      stack: shownStack(),
      description: t('tree.heightStart', { root: node(tree.root).value }),
    }),
  )
  const popped: number[] = []
  while (stack.length > 0) {
    const [id, depth] = stack.pop()!
    const n = node(id)
    const before = largest
    largest = Math.max(largest, depth)
    const children = [n.left, n.right].filter((child): child is number => child !== null)
    for (const child of children) stack.push([child, depth + 1])
    const depthText = depth > before ? t('tree.deeper', { depth, before }) : t('tree.notDeeper', { depth, before })
    const pushText =
      children.length === 0
        ? t('tree.noChildren', { value: n.value })
        : t('tree.pushChildren', { count: children.length, depth: depth + 1, pairs: joinAnd(t, children.map((child) => t('tree.pair', { value: node(child).value, depth: depth + 1 }))) })
    frames.push(
      frame({
        marks: [...pathMarks(popped), { id, mark: 'current' }],
        vars: vars(),
        stack: shownStack(),
        description: `${t('tree.popPair', { value: n.value, depth })} ${depthText} ${pushText}`,
      }),
    )
    popped.push(id)
  }
  frames.push(
    frame({
      marks: pathMarks(popped),
      vars: vars(),
      stack: [],
      output: String(largest),
      description: t('tree.heightDone', { count: largest }),
    }),
  )
  return frames
}

// Lowest common ancestor: walk down from the root; both smaller, go left; both larger, go
// right; otherwise this node is the split point. Expects p and q in values (n >= 1).
export function lcaFrames(values: number[], p: number, q: number, t: T): TreeFrame[] {
  const { tree, node, frame, build } = makeTree(values, t)
  let at: number | null = null
  const vars = () => [
    { name: 'p', value: String(p) },
    { name: 'q', value: String(q) },
    { name: 'node', value: at === null ? '-' : String(node(at).value) },
  ]
  const frames: TreeFrame[] = []
  build(frames, vars)

  at = tree.root!
  frames.push(frame({ marks: [{ id: at, mark: 'current' }], vars: vars(), description: t('tree.lcaStart', { root: node(at).value, p, q }) }))
  const path: number[] = []
  for (;;) {
    const n = node(at)
    const v = n.value
    if (p < v && q < v) {
      frames.push(
        frame({
          marks: [...pathMarks(path), { id: at, mark: 'current' }],
          edge: [at, n.left!],
          vars: vars(),
          description: t('tree.lcaLeft', { v, p, q, next: node(n.left!).value }),
        }),
      )
      path.push(at)
      at = n.left!
    } else if (p > v && q > v) {
      frames.push(
        frame({
          marks: [...pathMarks(path), { id: at, mark: 'current' }],
          edge: [at, n.right!],
          vars: vars(),
          description: t('tree.lcaRight', { v, p, q, next: node(n.right!).value }),
        }),
      )
      path.push(at)
      at = n.right!
    } else {
      const params = { v, p, q, opP: p < v ? '<' : '>', opQ: q < v ? '<' : '>' }
      let description: string
      if (p === v && q === v) description = t('tree.splitBoth', params)
      else if (p === v) description = t('tree.splitP', params)
      else if (q === v) description = t('tree.splitQ', params)
      else description = t('tree.splitSides', params)
      frames.push(
        frame({
          marks: [...pathMarks(path), { id: at, mark: 'answer' }],
          vars: vars(),
          output: String(v),
          description,
        }),
      )
      return frames
    }
  }
}

// Delete x with the problem's rule (no children: unlink; one child: link the parent to it;
// two children: copy the successor, the smallest value in the right subtree, then remove the
// successor node), then print the preorder. Expects x in values (n >= 1).
export function deleteFrames(values: number[], x: number, t: T): TreeFrame[] {
  const { tree, node, frame, build } = makeTree(values, t)
  let parent: number | null = null
  let cur: number | null = null
  let curText: string | null = null // cur's label once its node is gone
  let succ: number | null = null
  let succParent: number | null = null
  const valueText = (id: number | null) => (id === null ? t('tree.nothing') : String(node(id).value))
  const vars = () => {
    const shown = [
      { name: 'x', value: String(x) },
      { name: 'parent', value: cur === null ? '-' : valueText(parent) },
      { name: 'cur', value: curText ?? (cur === null ? '-' : valueText(cur)) },
    ]
    if (succ !== null) shown.push({ name: t('tree.successor'), value: valueText(succ) }, { name: t('tree.successorParent'), value: valueText(succParent) })
    return shown
  }
  const frames: TreeFrame[] = []
  build(frames, vars)

  cur = tree.root!
  frames.push(frame({ marks: [{ id: cur, mark: 'current' }], vars: vars(), description: t('tree.deleteStart', { x, root: node(cur).value }) }))
  const path: number[] = []
  while (node(cur).value !== x) {
    const v = node(cur).value
    const goLeft: boolean = x < v
    const next: number = goLeft ? node(cur).left! : node(cur).right!
    path.push(cur)
    parent = cur
    cur = next
    frames.push(
      frame({
        marks: [...pathMarks(path), { id: cur, mark: 'current' }],
        edge: [parent, cur],
        vars: vars(),
        description: t(goLeft ? 'tree.walkLeft' : 'tree.walkRight', { x, v, next: node(next).value }),
      }),
    )
  }

  const target = node(cur)
  const children = [target.left, target.right].filter((child): child is number => child !== null)
  const side = parent === null ? null : node(parent).left === cur ? 'left' : 'right'

  if (children.length < 2) {
    let caseText: string
    let doneText: string
    const parentValue = parent === null ? null : node(parent).value
    if (children.length === 0) {
      caseText = parent === null ? t('tree.leafRoot', { x }) : t('tree.leaf', { x })
      doneText = parent === null ? t('tree.onlyNodeGone') : t(side === 'left' ? 'tree.unlinkLeft' : 'tree.unlinkRight', { parent: parentValue, x })
    } else {
      const child = node(children[0]).value
      caseText = parent === null ? t('tree.oneChildRoot', { x, child }) : t('tree.oneChild', { x, child })
      doneText = parent === null ? t('tree.newRoot', { child }) : t(side === 'left' ? 'tree.relinkLeft' : 'tree.relinkRight', { parent: parentValue, child, x })
    }
    frames.push(frame({ marks: [...pathMarks(path), { id: cur, mark: 'current' }], vars: vars(), description: caseText }))

    const replacement = children.length === 0 ? null : children[0]
    if (parent === null) tree.root = replacement
    else if (side === 'left') node(parent).left = replacement
    else node(parent).right = replacement
    tree.nodes[cur] = null
    curText = t('tree.removed', { x })
    frames.push(
      frame({
        marks: replacement === null ? pathMarks(path) : [...pathMarks(path), { id: replacement, mark: 'focus' }],
        edge: parent !== null && replacement !== null ? [parent, replacement] : undefined,
        vars: vars(),
        description: doneText,
      }),
    )
  } else {
    frames.push(
      frame({
        marks: [...pathMarks(path), { id: cur, mark: 'current' }],
        vars: vars(),
        description: t('tree.twoChildren', { x, left: node(target.left!).value, right: node(target.right!).value }),
      }),
    )
    succParent = cur
    succ = target.right!
    const walk: number[] = []
    const noLeft = (id: number) => (node(id).left === null ? ` ${t('tree.noLeft', { value: node(id).value })}` : '')
    frames.push(
      frame({
        marks: [{ id: cur, mark: 'current' }, { id: succ, mark: 'focus' }],
        edge: [cur, succ],
        vars: vars(),
        description: `${t('tree.stepRight', { succ: node(succ).value, parent: node(cur).value })}${noLeft(succ)}`,
      }),
    )
    while (node(succ).left !== null) {
      walk.push(succ)
      succParent = succ
      succ = node(succ).left!
      frames.push(
        frame({
          marks: [...pathMarks(walk), { id: cur, mark: 'current' }, { id: succ, mark: 'focus' }],
          edge: [succParent, succ],
          vars: vars(),
          description: `${t('tree.stepLeft', { succ: node(succ).value, parent: node(succParent).value })}${noLeft(succ)}`,
        }),
      )
    }

    const s = node(succ)
    target.value = s.value
    frames.push(
      frame({
        marks: [{ id: cur, mark: 'current' }, { id: succ, mark: 'focus' }],
        vars: vars(),
        description: t('tree.copy', { value: s.value, x }),
      }),
    )

    const right = s.right
    const rightText = right === null ? t('tree.nothing') : String(node(right).value)
    let doneText: string
    if (succParent === cur) {
      target.right = right
      doneText = t('tree.succDirect', { right: rightText })
    } else {
      node(succParent).left = right
      const params = { value: s.value, right: rightText, parent: node(succParent).value }
      doneText = right === null ? t('tree.succDeepNone', params) : t('tree.succDeepOne', params)
    }
    tree.nodes[succ] = null
    const removedParent = succParent
    succ = null
    succParent = null
    frames.push(
      frame({
        marks: right === null ? [{ id: cur, mark: 'current' }] : [{ id: cur, mark: 'current' }, { id: right, mark: 'focus' }],
        edge: right === null ? undefined : [removedParent, right],
        vars: vars(),
        description: doneText,
      }),
    )
  }

  const order = preorder(tree)
  frames.push(
    frame({
      vars: vars(),
      output: order.join(' '),
      description:
        order.length === 0 ? t('tree.printEmpty') : t('tree.printPreorder', { order: order.join(' ') }),
    }),
  )
  return frames
}
