import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { componentColor } from './componentColors'
import { componentsFrames, type ComponentsFrame } from './componentsFrames'
import type { T } from './i18n'
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

function parseInput(nText: string, edgesText: string, t: T): Graph | { field: 'n' | 'edges'; message: string } {
  const nTrimmed = nText.trim()
  if (!/^\d+$/.test(nTrimmed) || Number(nTrimmed) < 1 || Number(nTrimmed) > MAX_NODES) {
    return { field: 'n', message: t('components.invalidN', { max: MAX_NODES }) }
  }
  const n = Number(nTrimmed)
  const parts = edgesText.split(/[,\n]/).map((part) => part.trim()).filter(Boolean)
  if (parts.length > MAX_EDGES) return { field: 'edges', message: t('components.tooManyEdges', { count: MAX_EDGES }) }
  const edges: [number, number][] = []
  for (const [index, part] of parts.entries()) {
    if (!/^\d+\s+\d+$/.test(part)) return { field: 'edges', message: t('components.badEdge', { index: index + 1, part }) }
    const [u, v] = part.split(/\s+/).map(Number)
    if (u < 1 || u > n || v < 1 || v > n) return { field: 'edges', message: t('components.outsideEdge', { index: index + 1, u, v, n }) }
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
  if (id === null) return 'fill-surface stroke-muted'
  const color = componentColor(id)
  return frame.current === node ? `${color.fill} stroke-warn` : `${color.fill} ${color.stroke}`
}

function graphLabel(frame: ComponentsFrame, t: T) {
  const nodes = Array.from({ length: frame.n }, (_, i) => {
    const id = frame.component[i + 1]
    return id === null ? t('components.nodeNotVisited', { node: i + 1 }) : t('components.nodeIn', { node: i + 1, id })
  }).join(t('common.listSeparator'))
  const edges = frame.edges.length === 0 ? t('components.noEdges') : t('components.edgesList', { list: frame.edges.map(([u, v]) => `${u}-${v}`).join(', ') })
  if (frame.current === null) return t('components.graphLabel', { nodes, edges })
  return t('components.graphLabelPopped', { nodes, edges, popped: frame.current })
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
  const { t } = useTranslation('visuals')
  const id = useId()
  const [graph, setGraph] = useState(randomGraph)
  const [nText, setNText] = useState('')
  const [edgesText, setEdgesText] = useState('')
  const [inputError, setInputError] = useState<{ field: 'n' | 'edges'; message: string } | null>(null)

  const frames = useMemo(() => componentsFrames(graph.n, graph.edges, t), [graph, t])
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
    const parsed = parseInput(nText, edgesText, t)
    if ('message' in parsed) {
      setInputError(parsed)
      return
    }
    setInputError(null)
    restart(parsed)
  }

  const describedBy = (field: 'n' | 'edges') => `${id}-hint${inputError?.field === field ? ` ${id}-error` : ''}`
  const inputClass = (field: 'n' | 'edges') =>
    `block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-field hover:border-muted'
    }`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ['count', current.count],
          [t('components.loopAt'), current.checked ?? '-'],
          [t('components.popped'), current.current ?? '-'],
        ].map(([name, value]) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
            <span className="text-sm text-muted">
              <TextWithCode text={String(name)} />
            </span>
            <span dir="ltr" className="text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          tabIndex={0}
          role="region"
          aria-label={t('components.region')}
          dir="ltr"
          className="overflow-x-auto rounded border border-line bg-surface p-2"
        >
          <div role="img" aria-label={graphLabel(current, t)} className="w-max">
            <Diagram frame={current} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            <TextWithCode text={t('components.stackTitle')} />
          </p>
          <div
            aria-label={t('components.stackLabel', { list: current.stack.length === 0 ? t('components.empty') : current.stack.join(', ') })}
            dir="ltr"
            className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded border border-line bg-surface p-1.5">
            {current.stack.length === 0 && <span className="px-1 text-sm text-muted">{t('components.empty')}</span>}
            {current.stack.map((node) => (
              <span
                key={node}
                className={`flex size-7 items-center justify-center rounded border text-sm font-semibold tabular-nums ${current.pushed.includes(node) ? 'border-accent bg-accent-soft' : 'border-muted bg-surface'}`}
              >
                {node}
              </span>
            ))}
          </div>

          <p className="mt-3 text-sm font-medium">
            <TextWithCode text={t('components.components')} />
          </p>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {groups.length === 0 && <li className="text-muted">{t('components.noneYet')}</li>}
            {groups.map(([group, nodes]) => (
              <li key={group} className="flex items-center gap-2">
                <span className={`inline-block size-3 rounded-sm border ${componentColor(group).bg} ${componentColor(group).border}`} aria-hidden="true" />
                <TextWithCode text={t('components.component', { id: group, nodes: nodes.join(', ') })} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-muted bg-surface" aria-hidden="true" />
          {t('components.legendNotVisited')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-warn bg-surface" aria-hidden="true" />
          <TextWithCode text={t('components.legendPopped')} />
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-accent bg-accent-soft" aria-hidden="true" />
          <TextWithCode text={t('components.legendPushed')} />
        </li>
        <li>
          <TextWithCode text={t('components.legendColours')} />
        </li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')} <span className="font-mono">{current.output}</span>
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomGraph())} className={buttonClass}>
          {t('common.newRandomExample')}
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
                dir="ltr"
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
                <TextWithCode text={t('components.ownEdges')} />
              </label>
              <input
                id={`${id}-edges`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={edgesText}
                onChange={(event) => setEdgesText(event.target.value)}
                placeholder={t('components.placeholder')}
                aria-invalid={inputError?.field === 'edges'}
                aria-describedby={describedBy('edges')}
                className={`mt-1 ${inputClass('edges')}`}
              />
            </div>
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThese')}
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t('components.hint', { maxNodes: MAX_NODES, maxEdges: MAX_EDGES })} />
          </p>
          {inputError && (
            <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError.message} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
