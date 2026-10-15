import { useId, useMemo, useState, type FormEvent } from 'react'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { deleteFrames, heightFrames, lcaFrames, type Mark, type TreeFrame, type TreeMode } from './treeFrames'
import { diagramSize, NODE_R, treeLayout } from './treeLayout'
import { usePlayback } from './usePlayback'

// The problems allow up to 1000 distinct values from -1000000 to 1000000; the visual draws at
// most 10, small enough to fit in a node.
const MAX_NODES = 10
const MAX_VALUE = 999

type Source = { values: number[]; p: number; q: number; x: number }
type Member = 'p' | 'q' | 'x'
type Field = 'values' | Member

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)]
}

// Distinct values: usually in random order, sometimes sorted (a chain) or the other way round.
function randomValues(min: number, max: number) {
  const values = new Set<number>()
  const count = randomInt(min, max)
  while (values.size < count) values.add(randomInt(-20, 99))
  const list = [...values]
  const shape = Math.random()
  if (shape < 0.1) return list.sort((a, b) => a - b)
  if (shape < 0.2) return list.sort((a, b) => b - a)
  return list
}

function parseValues(text: string, minCount: number): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > MAX_VALUE)) {
    return `Use whole numbers from -${MAX_VALUE} to ${MAX_VALUE}, separated by spaces or commas.`
  }
  if (parts.length < minCount) return `Enter at least ${minCount} ${minCount === 1 ? 'number' : 'numbers'}.`
  if (parts.length > MAX_NODES) return `Enter at most ${MAX_NODES} numbers, so the tree fits.`
  const values = parts.map(Number)
  const repeated = values.find((value, index) => values.indexOf(value) !== index)
  if (repeated !== undefined) return `The values must be distinct: ${repeated} appears more than once.`
  return values
}

function parseMember(text: string, name: string, values: number[]): number | string {
  const trimmed = text.trim()
  if (!/^-?\d+$/.test(trimmed)) return `${name} must be a whole number, one of the values in the tree.`
  const value = Number(trimmed)
  if (!values.includes(value)) return `${name} = ${value} is not in the tree. Use one of: ${values.join(' ')}.`
  return value
}

const MODES = {
  height: {
    frames: (source: Source) => heightFrames(source.values),
    random: (): Source => {
      const shape = Math.random()
      if (shape < 0.15) return { values: [4, 2, 6, 1, 3, 5, 7], p: 0, q: 0, x: 0 }
      if (shape < 0.25) return { values: [1, 5, 2, 4, 3], p: 0, q: 0, x: 0 }
      return { values: randomValues(5, 9), p: 0, q: 0, x: 0 }
    },
    fields: [] as Member[],
    minCount: 0,
    placeholder: 'e.g. 4 2 6 1 3 5 7',
    hint: `0 to ${MAX_NODES} distinct whole numbers from -${MAX_VALUE} to ${MAX_VALUE}, in insertion order. Leave it empty for an empty tree. (The problem allows up to 1000 values from -1000000 to 1000000.)`,
  },
  lca: {
    frames: (source: Source) => lcaFrames(source.values, source.p, source.q),
    random: (): Source => {
      if (Math.random() < 0.2) {
        const [p, q] = pick([
          [2, 8],
          [2, 5],
          [5, 3],
        ])
        return { values: [6, 2, 8, 0, 4, 7, 9, 3, 5], p, q, x: 0 }
      }
      const values = randomValues(5, 9)
      const p = pick(values)
      return { values, p, q: Math.random() < 0.1 ? p : pick(values), x: 0 }
    },
    fields: ['p', 'q'] as Member[],
    minCount: 2,
    placeholder: 'e.g. 6 2 8 0 4 7 9 3 5',
    hint: `2 to ${MAX_NODES} distinct whole numbers from -${MAX_VALUE} to ${MAX_VALUE}, in insertion order, then p and q: two values from the tree, in either order, and they may be equal. (The problem allows up to 1000 values from -1000000 to 1000000.)`,
  },
  delete: {
    frames: (source: Source) => deleteFrames(source.values, source.x),
    random: (): Source => {
      if (Math.random() < 0.2) return { values: [50, 30, 70, 20, 40, 60, 80, 65], p: 0, q: 0, x: pick([50, 20]) }
      const values = randomValues(5, 9)
      return { values, p: 0, q: 0, x: pick(values) }
    },
    fields: ['x'] as Member[],
    minCount: 1,
    placeholder: 'e.g. 50 30 70 20 40 60 80 65',
    hint: `1 to ${MAX_NODES} distinct whole numbers from -${MAX_VALUE} to ${MAX_VALUE}, in insertion order, then x: the value to delete, one of the values in the tree. (The problem allows up to 1000 values from -1000000 to 1000000.)`,
  },
}

// Node colours by mark. Class names are written out in full so Tailwind generates them.
const NODE_CLASS: Record<Mark | 'plain', string> = {
  plain: 'fill-white stroke-muted',
  path: 'fill-accent-soft stroke-accent',
  current: 'fill-white stroke-warn',
  focus: 'fill-white stroke-pass',
  answer: 'fill-pass stroke-pass',
}

const MARK_NAMES: Record<TreeMode, Record<Mark, string>> = {
  height: { path: 'on the insert path or popped', current: 'just popped', focus: 'just inserted', answer: '' },
  lca: { path: 'on the path', current: 'node', focus: 'just inserted', answer: 'lowest common ancestor' },
  delete: { path: 'on the path', current: 'cur', focus: 'just inserted, successor or moved up', answer: '' },
}

function treeLabel(frame: TreeFrame, mode: TreeMode) {
  if (frame.root === null) return 'The tree is empty.'
  const byId = new Map(frame.nodes.map((node) => [node.id, node]))
  const valueOf = (id: number | null) => (id === null ? 'none' : String(byId.get(id)!.value))
  const nodes = [...frame.nodes]
    .sort((a, b) => a.slot - b.slot)
    .map((node) => `${node.value} (left ${valueOf(node.left)}, right ${valueOf(node.right)})`)
  const marks = frame.marks.map(({ id, mark }) => `${MARK_NAMES[mode][mark]}: ${valueOf(id)}`)
  return `Root ${valueOf(frame.root)}. Nodes: ${nodes.join(', ')}.${marks.length > 0 ? ` ${marks.join('; ')}.` : ''}`
}

function Diagram({ frame, rows }: { frame: TreeFrame; rows: number }) {
  const { width, height } = diagramSize(frame.slots, rows)
  const points = treeLayout(frame.nodes, frame.root)
  const markOf = new Map(frame.marks.map(({ id, mark }) => [id, mark]))
  const edgeIs = (from: number, to: number) => frame.edge !== null && frame.edge[0] === from && frame.edge[1] === to
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden="true">
      {frame.root === null && (
        <text x={width / 2} y={height / 2 + 5} textAnchor="middle" className="fill-muted text-sm">
          empty tree
        </text>
      )}
      {frame.nodes.flatMap((node) =>
        [node.left, node.right]
          .filter((child): child is number => child !== null)
          .map((child) => {
            const a = points.get(node.id)!
            const b = points.get(child)!
            const active = edgeIs(node.id, child)
            return <line key={`${node.id}-${child}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={active ? 3 : 2} className={active ? 'stroke-warn' : 'stroke-muted'} />
          }),
      )}
      {frame.nodes.map((node) => {
        const { x, y } = points.get(node.id)!
        const mark = markOf.get(node.id)
        const thick = mark === 'current' || mark === 'focus'
        return (
          <g key={node.id}>
            <circle cx={x} cy={y} r={NODE_R} strokeWidth={thick ? 4 : 2} className={`${NODE_CLASS[mark ?? 'plain']} motion-safe:transition-colors motion-safe:duration-300`} />
            <text x={x} y={y + 4} textAnchor="middle" className={`font-mono text-xs font-semibold ${mark === 'answer' ? 'fill-white' : 'fill-ink'}`}>
              {node.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// One drawing, three lessons: build the tree, then find its height, the lowest common
// ancestor of p and q, or delete x.
export default function TreeVisual({ mode }: { mode: TreeMode }) {
  const id = useId()
  const config = MODES[mode]
  const [source, setSource] = useState(config.random)
  const [valuesText, setValuesText] = useState('')
  const [memberText, setMemberText] = useState<Record<Member, string>>({ p: '', q: '', x: '' })
  const [inputError, setInputError] = useState<{ field: Field; message: string } | null>(null)

  const frames = useMemo(() => config.frames(source), [config, source])
  // The deepest the tree gets in any step, so the drawing keeps one height while it plays.
  const rows = useMemo(() => Math.max(1, ...frames.map((frame) => Math.max(0, ...[...treeLayout(frame.nodes, frame.root).values()].map((point) => point.depth + 1)))), [frames])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function restart(nextSource: Source) {
    setSource(nextSource)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = parseValues(valuesText, config.minCount)
    if (typeof values === 'string') {
      setInputError({ field: 'values', message: values })
      return
    }
    const next: Source = { values, p: 0, q: 0, x: 0 }
    for (const field of config.fields) {
      const value = parseMember(memberText[field], field, values)
      if (typeof value === 'string') {
        setInputError({ field, message: value })
        return
      }
      next[field] = value
    }
    setInputError(null)
    restart(next)
  }

  const describedBy = (field: Field) => `${id}-input-hint${inputError?.field === field ? ` ${id}-input-error` : ''}`
  const inputClass = (field: Field) =>
    `block w-full min-w-0 rounded border bg-white px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-line hover:border-muted'
    }`
  const marks = new Set(frames.flatMap((frame) => frame.marks.map(({ mark }) => mark)))

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {current.vars.map(({ name, value }) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-white px-3 py-1.5">
            <span className="text-sm text-muted">{name}</span>
            <span className="text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Tree drawing, scrolls sideways when it is wider than the screen"
        className="mt-3 overflow-x-auto rounded border border-line bg-white p-2"
      >
        <div role="img" aria-label={treeLabel(current, mode)} className="w-max">
          <Diagram frame={current} rows={rows} />
        </div>
      </div>

      {current.stack !== null && (
        <>
          <p className="mt-3 text-sm font-medium">Stack of (value, depth) pairs (top on the right)</p>
          <div aria-label={`Stack: ${current.stack.length === 0 ? 'empty' : current.stack.join(', ')}.`} className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded border border-line bg-white p-1.5">
            {current.stack.length === 0 && <span className="px-1 text-sm text-muted">empty</span>}
            {current.stack.map((pair, index) => (
              <span key={index} className="rounded border border-muted bg-white px-1.5 py-0.5 font-mono text-sm tabular-nums">
                {pair}
              </span>
            ))}
          </div>
        </>
      )}

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {marks.has('path') && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full border-2 border-accent bg-accent-soft" aria-hidden="true" />
            {mode === 'height' ? 'On the insert path, or already popped' : 'On the path walked'}
          </li>
        )}
        {marks.has('current') && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full border-2 border-warn bg-white" aria-hidden="true" />
            {mode === 'height' ? 'Just popped' : mode === 'lca' ? 'node' : 'cur'}
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-pass bg-white" aria-hidden="true" />
          {mode === 'delete' ? 'Just inserted, the successor, or the child that moved up' : 'Just inserted'}
        </li>
        {mode === 'lca' && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full border-2 border-pass bg-pass" aria-hidden="true" />
            Lowest common ancestor
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-warn" aria-hidden="true" />
          Link used or changed in this step
        </li>
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded border border-line bg-white px-3 py-2 font-semibold">
          Output: {current.output === '' ? <span className="font-normal text-muted">(an empty line)</span> : <span className="font-mono">{current.output}</span>}
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(config.random())} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-values`} className="block text-sm font-medium">
                Your own values
              </label>
              <input
                id={`${id}-values`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={valuesText}
                onChange={(event) => setValuesText(event.target.value)}
                placeholder={config.placeholder}
                aria-invalid={inputError?.field === 'values'}
                aria-describedby={describedBy('values')}
                className={`mt-1 ${inputClass('values')}`}
              />
            </div>
            {config.fields.map((field) => (
              <div key={field} className="w-20">
                <label htmlFor={`${id}-${field}`} className="block text-sm font-medium">
                  {field}
                </label>
                <input
                  id={`${id}-${field}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={memberText[field]}
                  onChange={(event) => setMemberText({ ...memberText, [field]: event.target.value })}
                  aria-invalid={inputError?.field === field}
                  aria-describedby={describedBy(field)}
                  className={`mt-1 ${inputClass(field)}`}
                />
              </div>
            ))}
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use these
            </button>
          </div>
          <p id={`${id}-input-hint`} className="mt-1 text-xs text-muted">
            {config.hint}
          </p>
          {inputError && (
            <p id={`${id}-input-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export function HeightVisual() {
  return <TreeVisual mode="height" />
}

export function LcaVisual() {
  return <TreeVisual mode="lca" />
}

export function DeleteVisual() {
  return <TreeVisual mode="delete" />
}
