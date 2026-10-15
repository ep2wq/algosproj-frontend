// Where each node of a binary search tree is drawn: x from its slot (its value's place in
// sorted order, so no two nodes share a column) and y from its depth. Pure, so the frames
// check can use it too.

export const NODE_R = 18
export const SLOT_W = 44
export const ROW_H = 52
export const PAD = 8

export type LayoutNode = { id: number; left: number | null; right: number | null; slot: number }

export type Point = { x: number; y: number; depth: number }

export function treeLayout(nodes: LayoutNode[], root: number | null): Map<number, Point> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const points = new Map<number, Point>()
  const queue: [number, number][] = root === null ? [] : [[root, 0]]
  for (let head = 0; head < queue.length; head++) {
    const [id, depth] = queue[head]
    const node = byId.get(id)!
    points.set(id, { x: PAD + node.slot * SLOT_W + SLOT_W / 2, y: PAD + NODE_R + depth * ROW_H, depth })
    if (node.left !== null) queue.push([node.left, depth + 1])
    if (node.right !== null) queue.push([node.right, depth + 1])
  }
  return points
}

// Size of a drawing with this many columns and rows (rows = deepest depth + 1).
export function diagramSize(slots: number, rows: number) {
  return {
    width: Math.max(slots, 2) * SLOT_W + 2 * PAD,
    height: Math.max(rows, 1) * ROW_H - (ROW_H - 2 * NODE_R) + 2 * PAD,
  }
}
