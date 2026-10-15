// Pure functions for the three binary search tree lessons. Each starts by inserting the values
// one by one into an empty tree, as the lessons do, one step per value, then runs that lesson's
// method on the finished tree: the height with a stack of (node, depth) pairs, the lowest
// common ancestor by walking down from the root, or deleting x with the successor rule.
// Nodes keep an id (insertion order) and a slot (their first value's place in sorted order),
// so a node never moves sideways. The player only reads these.

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

function joinAnd(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function pathMarks(ids: number[]) {
  return ids.map((id) => ({ id, mark: 'path' as Mark }))
}

// Expects distinct values.
function makeTree(values: number[]) {
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
            ? 'There are no values to insert, so the tree stays empty.'
            : values.length === 1
              ? `Insert the value ${values[0]} into an empty tree.`
              : `Insert the ${values.length} values one by one, in the order given: ${values.join(' ')}. Start with an empty tree.`,
      }),
    )
    for (const [id, value] of values.entries()) {
      nodes[id] = { id, value, left: null, right: null, slot: sorted.indexOf(value) }
      if (tree.root === null) {
        tree.root = id
        frames.push(frame({ marks: [{ id, mark: 'focus' }], vars: vars(), description: `Insert ${value}: the tree is empty, so ${value} becomes the root.` }))
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
          steps.push(`${value} < ${c.value}, go left`)
          if (c.left === null) {
            c.left = id
            side = 'left'
            break
          }
          cur = c.left
        } else {
          steps.push(`${value} > ${c.value}, go right`)
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
          description: `Insert ${value}: ${steps.join('; ')}; place ${value} as the ${side} child of ${node(cur).value}.`,
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
export function heightFrames(values: number[]): TreeFrame[] {
  const { tree, node, frame, build } = makeTree(values)
  let largest = 0
  const stack: [number, number][] = []
  const vars = () => [{ name: 'largest depth', value: String(largest) }]
  const shownStack = () => stack.map(([id, depth]) => `(${node(id).value}, ${depth})`)
  const frames: TreeFrame[] = []
  build(frames, vars)

  if (tree.root === null) {
    frames.push(
      frame({
        vars: vars(),
        stack: [],
        output: '0',
        description: 'The tree is empty: there is no root, so nothing goes on the stack. An empty tree has height 0. Print 0.',
      }),
    )
    return frames
  }

  stack.push([tree.root, 1])
  frames.push(
    frame({
      vars: vars(),
      stack: shownStack(),
      description: `The tree is built. Push (${node(tree.root).value}, 1): the root, at depth 1. The largest depth seen so far is 0.`,
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
    const depthText =
      depth > before ? `${depth} is larger than ${before}, so the largest depth is now ${depth}.` : `${depth} is not larger than ${before}, so the largest depth stays ${before}.`
    const pushText =
      children.length === 0
        ? `${n.value} has no children, so nothing is pushed.`
        : `Push its ${children.length === 1 ? 'child' : 'children'} with depth ${depth + 1}: ${joinAnd(children.map((child) => `(${node(child).value}, ${depth + 1})`))}.`
    frames.push(
      frame({
        marks: [...pathMarks(popped), { id, mark: 'current' }],
        vars: vars(),
        stack: shownStack(),
        description: `Pop (${n.value}, ${depth}). ${depthText} ${pushText}`,
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
      description: `The stack is empty. The height is the largest depth seen, ${largest} ${largest === 1 ? 'node' : 'nodes'} from the root down. Print ${largest}.`,
    }),
  )
  return frames
}

// Lowest common ancestor: walk down from the root; both smaller, go left; both larger, go
// right; otherwise this node is the split point. Expects p and q in values (n >= 1).
export function lcaFrames(values: number[], p: number, q: number): TreeFrame[] {
  const { tree, node, frame, build } = makeTree(values)
  let at: number | null = null
  const vars = () => [
    { name: 'p', value: String(p) },
    { name: 'q', value: String(q) },
    { name: 'node', value: at === null ? '-' : String(node(at).value) },
  ]
  const frames: TreeFrame[] = []
  build(frames, vars)

  at = tree.root!
  frames.push(frame({ marks: [{ id: at, mark: 'current' }], vars: vars(), description: `The tree is built. Walk down from the root, ${node(at).value}, with p = ${p} and q = ${q}.` }))
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
          description: `At ${v}: ${p} < ${v} and ${q} < ${v}, both are smaller, so go left to ${node(n.left!).value}.`,
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
          description: `At ${v}: ${p} > ${v} and ${q} > ${v}, both are larger, so go right to ${node(n.right!).value}.`,
        }),
      )
      path.push(at)
      at = n.right!
    } else {
      let reason: string
      if (p === v && q === v) reason = `p and q are both ${v}, the node itself`
      else if (p === v) reason = `p is the node itself`
      else if (q === v) reason = `q is the node itself`
      else reason = `${p} ${p < v ? '<' : '>'} ${v} and ${q} ${q < v ? '<' : '>'} ${v}, so they lie on different sides`
      frames.push(
        frame({
          marks: [...pathMarks(path), { id: at, mark: 'answer' }],
          vars: vars(),
          output: String(v),
          description: `At ${v}: ${reason}. ${v} is the split point: print ${v}.`,
        }),
      )
      return frames
    }
  }
}

// Delete x with the problem's rule (no children: unlink; one child: link the parent to it;
// two children: copy the successor, the smallest value in the right subtree, then remove the
// successor node), then print the preorder. Expects x in values (n >= 1).
export function deleteFrames(values: number[], x: number): TreeFrame[] {
  const { tree, node, frame, build } = makeTree(values)
  let parent: number | null = null
  let cur: number | null = null
  let curText: string | null = null // cur's label once its node is gone
  let succ: number | null = null
  let succParent: number | null = null
  const valueText = (id: number | null) => (id === null ? 'nothing' : String(node(id).value))
  const vars = () => {
    const shown = [
      { name: 'x', value: String(x) },
      { name: 'parent', value: cur === null ? '-' : valueText(parent) },
      { name: 'cur', value: curText ?? (cur === null ? '-' : valueText(cur)) },
    ]
    if (succ !== null) shown.push({ name: 'successor', value: valueText(succ) }, { name: "successor's parent", value: valueText(succParent) })
    return shown
  }
  const frames: TreeFrame[] = []
  build(frames, vars)

  cur = tree.root!
  frames.push(frame({ marks: [{ id: cur, mark: 'current' }], vars: vars(), description: `The tree is built. Find x = ${x}: cur starts at the root, ${node(cur).value}, and parent is nothing.` }))
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
        description: `${x} ${goLeft ? '<' : '>'} ${v}, so go ${goLeft ? 'left' : 'right'}: parent = ${v}, cur = ${node(next).value}.`,
      }),
    )
  }

  const target = node(cur)
  const children = [target.left, target.right].filter((child): child is number => child !== null)
  const side = parent === null ? null : node(parent).left === cur ? 'left' : 'right'
  const found = `cur holds x = ${x}.`

  if (children.length < 2) {
    let caseText: string
    let doneText: string
    if (children.length === 0) {
      caseText = parent === null ? `${found} It has no children and no parent: it is the only node.` : `${found} It has no children: it is a leaf, so set the parent's link to nothing.`
      doneText = parent === null ? 'Deleting the only node leaves nothing: the tree is empty.' : `Set ${node(parent).value}'s ${side} link to nothing. ${x} is gone.`
    } else {
      const child = node(children[0]).value
      caseText =
        parent === null
          ? `${found} It has one child, ${child}, and no parent: it is the root.`
          : `${found} It has one child, ${child}: point the parent's link at that child.`
      doneText =
        parent === null
          ? `The root has no parent, so deleting it makes its child, ${child}, the new root.`
          : `Point ${node(parent).value}'s ${side} link at ${child}. Its subtree moves up with it, and ${x} is gone.`
    }
    frames.push(frame({ marks: [...pathMarks(path), { id: cur, mark: 'current' }], vars: vars(), description: caseText }))

    const replacement = children.length === 0 ? null : children[0]
    if (parent === null) tree.root = replacement
    else if (side === 'left') node(parent).left = replacement
    else node(parent).right = replacement
    tree.nodes[cur] = null
    curText = `${x} (removed)`
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
        description: `${found} It has two children, ${node(target.left!).value} and ${node(target.right!).value}: find the successor, the smallest value in the right subtree.`,
      }),
    )
    succParent = cur
    succ = target.right!
    const walk: number[] = []
    const noLeft = (id: number) => (node(id).left === null ? ` ${node(id).value} has no left child, so it is the successor.` : '')
    frames.push(
      frame({
        marks: [{ id: cur, mark: 'current' }, { id: succ, mark: 'focus' }],
        edge: [cur, succ],
        vars: vars(),
        description: `Step right once: successor = ${node(succ).value}, successor's parent = ${node(cur).value}.${noLeft(succ)}`,
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
          description: `${node(succParent).value} has a left child, so step left: successor = ${node(succ).value}, successor's parent = ${node(succParent).value}.${noLeft(succ)}`,
        }),
      )
    }

    const s = node(succ)
    target.value = s.value
    frames.push(
      frame({
        marks: [{ id: cur, mark: 'current' }, { id: succ, mark: 'focus' }],
        vars: vars(),
        description: `Copy ${s.value} into cur: the node that held ${x} now holds ${s.value}. Now remove the successor node.`,
      }),
    )

    const right = s.right
    const rightText = right === null ? 'nothing' : String(node(right).value)
    let doneText: string
    if (succParent === cur) {
      target.right = right
      doneText = `The successor is cur's own right child, so set cur.right to the successor's right child, ${rightText}.`
    } else {
      node(succParent).left = right
      doneText = `The old ${s.value} node has ${right === null ? 'no children' : `one child, ${rightText}`}, so ${node(succParent).value}'s left link now points at ${rightText}.`
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
        order.length === 0
          ? 'The tree is empty, so print an empty line.'
          : `Print the tree in preorder: the root, then the left subtree, then the right subtree: ${order.join(' ')}.`,
    }),
  )
  return frames
}
