// The call tree of a backtracking search: one node per call, in the order the calls happen.
// Leaves take one column each, left to right; a parent sits above the middle of its children.
// Pure, so the frames check can use it too.

export const CALL_W = 48
export const CALL_ROW_H = 52
export const CALL_BOX_W = 42
export const CALL_BOX_H = 24
export const CALL_PAD = 8

export type CallNode = { id: number; parent: number | null; label: string; depth: number }

export type CallPoint = { x: number; y: number }

export function callTreeLayout(nodes: CallNode[]): Map<number, CallPoint> {
  const children = new Map<number, number[]>()
  for (const node of nodes) {
    if (node.parent !== null) children.set(node.parent, [...(children.get(node.parent) ?? []), node.id])
  }
  const points = new Map<number, CallPoint>()
  let leaves = 0
  // Children are always created after their parent, so walking the ids backwards places every
  // child before its parent; leaves are counted in creation order first.
  const column = new Map<number, number>()
  for (const node of nodes) if (!children.has(node.id)) column.set(node.id, leaves++)
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]
    const kids = children.get(node.id)
    if (kids) {
      const first = column.get(kids[0])!
      const last = column.get(kids[kids.length - 1])!
      column.set(node.id, (first + last) / 2)
    }
    points.set(node.id, {
      x: CALL_PAD + column.get(node.id)! * CALL_W + CALL_W / 2,
      y: CALL_PAD + CALL_BOX_H / 2 + node.depth * CALL_ROW_H,
    })
  }
  return points
}

export function callTreeSize(nodes: CallNode[]) {
  const parents = new Set(nodes.map((node) => node.parent))
  const leaves = nodes.filter((node) => !parents.has(node.id)).length
  const rows = Math.max(0, ...nodes.map((node) => node.depth)) + 1
  return {
    width: Math.max(leaves, 1) * CALL_W + 2 * CALL_PAD,
    // Room below the bottom row for the small mark under a node.
    height: (rows - 1) * CALL_ROW_H + CALL_BOX_H + 2 * CALL_PAD + 14,
  }
}
