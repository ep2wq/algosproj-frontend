import { useId, useMemo, useState, type FormEvent } from 'react'
import { componentColor } from './componentColors'
import { componentsFrames, type ComponentsFrame } from './componentsFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

// The problem allows up to 1000 nodes and 5000 edges; these fit in the circle.
const MAX_NODES = 10
const MAX_EDGES = 15

type Graph = { n: number; edges: [number, number][] }

const LESSON_EXAMPLE: Graph = {
  n: 5,
  edges: [
    [1, 2],
    [2, 3],
    [4, 5],
  ],
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// Sometimes the lesson's example; otherwise a few random edges, so some nodes stay alone, with
// the odd self-loop or duplicate edge as the problem allows.
function randomGraph(): Graph {
  if (Math.random() < 0.2) return LESSON_EXAMPLE
  const n = randomInt(5, 9)
  const edges: [number, number][] = Array.from({ length: randomInt(2, Math.min(8, n)) }, () => {
    const u = randomInt(1, n)
    return [u, Math.random() < 0.1 ? u : randomInt(1, n)]
  })
  if (Math.random() < 0.3) edges.push([edges[0][1], edges[0][0]])
  return { n, edges }
}

function parseInput(nText: string, edgesText: string): Graph | { field: 'n' | 'edges'; message: string } {
  const nTrimmed = nText.trim()
  if (!/^\d+$/.test(nTrimmed) || Number(nTrimmed) < 1 || Number(nTrimmed) > MAX_NODES) {
    return { field: 'n', message: `n must be a whole number from 1 to ${MAX_NODES}.` }
  }
  const n = Number(nTrimmed)
  const parts = edgesText.split(/[,\n]/).map((part) => part.trim()).filter(Boolean)
  if (parts.length > MAX_EDGES) return { field: 'edges', message: `Use at most ${MAX_EDGES} edges, so the drawing stays readable.` }
  const edges: [number, number][] = []
  for (const [index, part] of parts.entries()) {
    if (!/^\d+\s+\d+$/.test(part)) return { field: 'edges', message: `Write each edge as two node numbers, like 1 2, and separate edges with commas. Edge ${index + 1} is "${part}".` }
    const [u, v] = part.split(/\s+/).map(Number)
    if (u < 1 || u > n || v < 1 || v > n) return { field: 'edges', message: `Edge ${index + 1}, ${u} ${v}, uses a node outside 1 to ${n}.` }
    edges.push([u, v])
  }
  return { n, edges }
}

// Diagram geometry in pixels: nodes on a circle.
const SIZE = 260
const CENTER = SIZE / 2
const RING = 96
const NODE_R = 17
const LOOP_R = 10

function position(node: number, n: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * (node - 1)) / n
  return { x: CENTER + RING * Math.cos(angle), y: CENTER + RING * Math.sin(angle), dx: Math.cos(angle), dy: Math.sin(angle) }
}

function nodeClass(frame: ComponentsFrame, node: number) {
  const id = frame.component[node]
  if (id === null) return 'fill-white stroke-muted'
  const color = componentColor(id)
  return frame.current === node ? `${color.fill} stroke-warn` : `${color.fill} ${color.stroke}`
}

function graphLabel(frame: ComponentsFrame) {
  const nodes = Array.from({ length: frame.n }, (_, i) => {
    const id = frame.component[i + 1]
    return `${i + 1} ${id === null ? 'not visited' : `in component ${id}`}`
  })
  const edges = frame.edges.length === 0 ? 'no edges' : `edges ${frame.edges.map(([u, v]) => `${u}-${v}`).join(', ')}`
  const popped = frame.current !== null ? ` Just popped: ${frame.current}.` : ''
  return `Nodes: ${nodes.join(', ')}. ${edges}.${popped}`
}

function Diagram({ frame }: { frame: ComponentsFrame }) {
  const { n } = frame
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block" aria-hidden="true">
      {frame.edges.map(([u, v], index) => {
        const active = frame.current !== null && (u === frame.current || v === frame.current)
        const line = active ? 'stroke-warn' : 'stroke-muted'
        const a = position(u, n)
        if (u === v) {
          // A self-loop: a small circle just outside the node.
          return <circle key={index} cx={a.x + a.dx * (NODE_R + LOOP_R - 4)} cy={a.y + a.dy * (NODE_R + LOOP_R - 4)} r={LOOP_R} fill="none" strokeWidth={2} className={line} />
        }
        const b = position(v, n)
        return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={active ? 3 : 2} className={line} />
      })}
      {Array.from({ length: n }, (_, i) => {
        const node = i + 1
        const { x, y } = position(node, n)
        return (
          <g key={node}>
            <circle
              cx={x}
              cy={y}
              r={NODE_R}
              strokeWidth={frame.current === node ? 4 : 2}
              className={`${nodeClass(frame, node)} motion-safe:transition-colors motion-safe:duration-300`}
            />
            <text x={x} y={y + 5} textAnchor="middle" className="fill-ink text-sm font-semibold">
              {node}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Counting connected components: loop over the nodes, and walk from each unvisited one with a stack.
export default function ComponentsVisual() {
  const id = useId()
  const [graph, setGraph] = useState(randomGraph)
  const [nText, setNText] = useState('')
  const [edgesText, setEdgesText] = useState('')
  const [inputError, setInputError] = useState<{ field: 'n' | 'edges'; message: string } | null>(null)

  const frames = useMemo(() => componentsFrames(graph.n, graph.edges), [graph])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  const groups = useMemo(() => {
    const byId = new Map<number, number[]>()
    for (let node = 1; node <= current.n; node++) {
      const group = current.component[node]
      if (group !== null) byId.set(group, [...(byId.get(group) ?? []), node])
    }
    return [...byId]
  }, [current])

  function restart(next: Graph) {
    setGraph(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(nText, edgesText)
    if ('message' in parsed) {
      setInputError(parsed)
      return
    }
    setInputError(null)
    restart(parsed)
  }

  const describedBy = (field: 'n' | 'edges') => `${id}-hint${inputError?.field === field ? ` ${id}-error` : ''}`
  const inputClass = (field: 'n' | 'edges') =>
    `block w-full min-w-0 rounded border bg-white px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-line hover:border-muted'
    }`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['count', current.count],
          ['loop at node', current.checked ?? '-'],
          ['popped', current.current ?? '-'],
        ].map(([name, value]) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-white px-3 py-1.5">
            <span className="text-sm text-muted">{name}</span>
            <span className="text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          tabIndex={0}
          role="region"
          aria-label="Graph drawing, scrolls sideways when wider than the screen"
          className="overflow-x-auto rounded border border-line bg-white p-2"
        >
          <div role="img" aria-label={graphLabel(current)} className="w-max">
            <Diagram frame={current} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Stack (top on the right)</p>
          <div aria-label={`Stack: ${current.stack.length === 0 ? 'empty' : current.stack.join(', ')}.`} className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded border border-line bg-white p-1.5">
            {current.stack.length === 0 && <span className="px-1 text-sm text-muted">empty</span>}
            {current.stack.map((node) => (
              <span
                key={node}
                className={`flex size-7 items-center justify-center rounded border text-sm font-semibold tabular-nums ${current.pushed.includes(node) ? 'border-accent bg-accent-soft' : 'border-muted bg-white'}`}
              >
                {node}
              </span>
            ))}
          </div>

          <p className="mt-3 text-sm font-medium">Components</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {groups.length === 0 && <li className="text-muted">none yet</li>}
            {groups.map(([group, nodes]) => (
              <li key={group} className="flex items-center gap-2">
                <span className={`inline-block size-3 rounded-sm border ${componentColor(group).bg} ${componentColor(group).border}`} aria-hidden="true" />
                Component {group}: {nodes.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-muted bg-white" aria-hidden="true" />
          Not visited
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-warn bg-white" aria-hidden="true" />
          Just popped, with its edges
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-accent bg-accent-soft" aria-hidden="true" />
          Pushed in this step
        </li>
        <li>Colours: one per component.</li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded border border-line bg-white px-3 py-2 font-semibold">
          Output: <span className="font-mono">{current.output}</span>
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomGraph())} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-16">
              <label htmlFor={`${id}-n`} className="block text-sm font-medium">
                n
              </label>
              <input
                id={`${id}-n`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={nText}
                onChange={(event) => setNText(event.target.value)}
                placeholder="5"
                aria-invalid={inputError?.field === 'n'}
                aria-describedby={describedBy('n')}
                className={`mt-1 ${inputClass('n')}`}
              />
            </div>
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-edges`} className="block text-sm font-medium">
                Your own edges
              </label>
              <input
                id={`${id}-edges`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={edgesText}
                onChange={(event) => setEdgesText(event.target.value)}
                placeholder="e.g. 1 2, 2 3, 4 5"
                aria-invalid={inputError?.field === 'edges'}
                aria-describedby={describedBy('edges')}
                className={`mt-1 ${inputClass('edges')}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use these
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            n from 1 to {MAX_NODES}, and 0 to {MAX_EDGES} edges written as u v and separated by commas, with nodes from 1 to n.
            Duplicate edges and self-loops are allowed, as in the problem (which allows up to 1000 nodes and 5000 edges).
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
