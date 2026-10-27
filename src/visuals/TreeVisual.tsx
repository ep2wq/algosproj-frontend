import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { deleteFrames, heightFrames, lcaFrames, type Mark, type TreeFrame, type TreeMode } from './treeFrames'
import { diagramSize, NODE_R, treeLayout } from './treeLayout'
import { usePlayback } from './usePlayback'
import { useScrollCue } from './useScrollCue'

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

function parseValues(text: string, minCount: number, t: T): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > MAX_VALUE)) {
    return t('inversions.invalid', { limit: MAX_VALUE })
  }
  if (parts.length < minCount) return t('tree.atLeast', { count: minCount })
  if (parts.length > MAX_NODES) return t('tree.atMost', { count: MAX_NODES })
  const values = parts.map(Number)
  const repeated = values.find((value, index) => values.indexOf(value) !== index)
  if (repeated !== undefined) return t('tree.repeated', { value: repeated })
  return values
}

function parseMember(text: string, name: string, values: number[], t: T): number | string {
  const trimmed = text.trim()
  if (!/^-?\d+$/.test(trimmed)) return t('tree.memberInvalid', { name })
  const value = Number(trimmed)
  if (!values.includes(value)) return t('tree.memberMissing', { name, value, values: values.join(' ') })
  return value
}

const MODES = {
  height: {
    frames: (source: Source, t: T) => heightFrames(source.values, t),
    random: (): Source => {
      const shape = Math.random()
      if (shape < 0.15) return { values: [4, 2, 6, 1, 3, 5, 7], p: 0, q: 0, x: 0 }
      if (shape < 0.25) return { values: [1, 5, 2, 4, 3], p: 0, q: 0, x: 0 }
      return { values: randomValues(5, 9), p: 0, q: 0, x: 0 }
    },
    fields: [] as Member[],
    minCount: 0,
  },
  lca: {
    frames: (source: Source, t: T) => lcaFrames(source.values, source.p, source.q, t),
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
  },
  delete: {
    frames: (source: Source, t: T) => deleteFrames(source.values, source.x, t),
    random: (): Source => {
      if (Math.random() < 0.2) return { values: [50, 30, 70, 20, 40, 60, 80, 65], p: 0, q: 0, x: pick([50, 20]) }
      const values = randomValues(5, 9)
      return { values, p: 0, q: 0, x: pick(values) }
    },
    fields: ['x'] as Member[],
    minCount: 1,
  },
}

// Node colours by mark. Class names are written out in full so Tailwind generates them.
const NODE_CLASS: Record<Mark | 'plain', string> = {
  plain: 'fill-surface stroke-muted',
  path: 'fill-accent-soft stroke-accent',
  current: 'fill-surface stroke-warn',
  focus: 'fill-surface stroke-pass',
  answer: 'fill-pass stroke-pass',
}

// The screen-reader name of each mark is the key tree.marks.<mode>.<mark>.
function treeLabel(frame: TreeFrame, mode: TreeMode, t: T) {
  if (frame.root === null) return t('tree.labelEmpty')
  const byId = new Map(frame.nodes.map((node) => [node.id, node]))
  const valueOf = (id: number | null) => (id === null ? t('tree.none') : String(byId.get(id)!.value))
  const nodes = [...frame.nodes]
    .sort((a, b) => a.slot - b.slot)
    .map((node) => t('tree.labelNode', { value: node.value, left: valueOf(node.left), right: valueOf(node.right) }))
    .join(t('common.listSeparator'))
  const marks = frame.marks.map(({ id, mark }) => t('tree.labelMark', { name: t(`tree.marks.${mode}.${mark}`), value: valueOf(id) })).join(t('tree.stepSeparator'))
  return marks ? t('tree.labelMarks', { root: valueOf(frame.root), nodes, marks }) : t('tree.label', { root: valueOf(frame.root), nodes })
}

function Diagram({ frame, rows }: { frame: TreeFrame; rows: number }) {
  const { width, height } = diagramSize(frame.slots, rows)
  const points = treeLayout(frame.nodes, frame.root)
  const markOf = new Map(frame.marks.map(({ id, mark }) => [id, mark]))
  const edgeIs = (from: number, to: number) => frame.edge !== null && frame.edge[0] === from && frame.edge[1] === to
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden="true">
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
            <circle cx={x} cy={y} r={NODE_R} strokeWidth={thick ? 4 : 2} className={`${NODE_CLASS[mark ?? 'plain']} motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm`} />
            <text x={x} y={y + 4} textAnchor="middle" className={`font-mono text-xs font-semibold ${mark === 'answer' ? 'fill-inverse' : 'fill-ink'}`}>
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
  const { t } = useTranslation('visuals')
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const id = useId()
  const config = MODES[mode]
  const [source, setSource] = useState(config.random)
  const [valuesText, setValuesText] = useState('')
  const [memberText, setMemberText] = useState<Record<Member, string>>({ p: '', q: '', x: '' })
  const [inputError, setInputError] = useState<{ field: Field; message: string } | null>(null)

  const frames = useMemo(() => config.frames(source, t), [config, source, t])
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
    const values = parseValues(valuesText, config.minCount, t)
    if (typeof values === 'string') {
      setInputError({ field: 'values', message: values })
      return
    }
    const next: Source = { values, p: 0, q: 0, x: 0 }
    for (const field of config.fields) {
      const value = parseMember(memberText[field], field, values, t)
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
    `block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-field hover:border-muted'
    }`
  const marks = new Set(frames.flatMap((frame) => frame.marks.map(({ mark }) => mark)))
  const hasEdge = frames.some((frame) => frame.edge !== null)

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {current.vars.map(({ name, value }) => (
          <p key={name} className="inline-flex items-baseline gap-2 rounded border border-line bg-surface px-3 py-1.5">
            <span className="text-sm text-muted">
              <TextWithCode text={name} />
            </span>
            <span dir="ltr" className="text-lg font-semibold tabular-nums">{value}</span>
          </p>
        ))}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label={t('tree.region')}
        dir="ltr"
        ref={scrollRef}
        className={`relative mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-2${scrollMore ? ' scroll-fade' : ''}`}
      >
        <div role="img" aria-label={treeLabel(current, mode, t)} className="w-max">
          <Diagram frame={current} rows={rows} />
        </div>
        {current.root === null && (
          <p aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            <TextWithCode text={t('tree.emptyTree')} />
          </p>
        )}
      </div>

      {current.stack !== null && (
        <>
          <p className="mt-3 text-sm font-medium">
            <TextWithCode text={t('tree.stackTitle')} />
          </p>
          <div
            aria-label={t('tree.stackLabel', { list: current.stack.length === 0 ? t('tree.empty') : current.stack.join(', ') })}
            dir="ltr"
            className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1.5">
            {current.stack.length === 0 && <span className="px-1 text-sm text-muted">{t('tree.empty')}</span>}
            {current.stack.map((pair, index) => (
              <span key={index} className="rounded border border-muted bg-surface px-1.5 py-0.5 font-mono text-sm tabular-nums">
                {pair}
              </span>
            ))}
          </div>
        </>
      )}

      {(marks.size > 0 || hasEdge) && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {marks.has('path') && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full border-2 border-accent bg-accent-soft" aria-hidden="true" />
              <TextWithCode text={mode === 'height' ? t('tree.legendPathHeight') : t('tree.legendPath')} />
            </li>
          )}
          {marks.has('current') && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full border-2 border-warn bg-surface" aria-hidden="true" />
              <TextWithCode text={mode === 'height' ? t('tree.legendPopped') : mode === 'lca' ? t('tree.legendNode') : t('tree.legendCur')} />
            </li>
          )}
          {marks.has('focus') && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full border-2 border-pass bg-surface" aria-hidden="true" />
              <TextWithCode text={mode === 'delete' ? t('tree.legendFocusDelete') : t('tree.legendFocus')} />
            </li>
          )}
          {marks.has('answer') && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full border-2 border-pass bg-pass" aria-hidden="true" />
              <TextWithCode text={t('tree.legendAnswer')} />
            </li>
          )}
          {hasEdge && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-warn" aria-hidden="true" />
              {t('tree.legendEdge')}
            </li>
          )}
        </ul>
      )}

      {current.output !== null && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')}{' '}
          {current.output === '' ? <span className="font-normal text-muted">{t('linkedList.emptyLine')}</span> : <span className="font-mono">{current.output}</span>}
        </p>
      )}

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>
      {step === 0 && lastStep > 0 && <p className="mt-2 text-sm text-muted">{t('tree.pressStep')}</p>}

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(config.random())} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-values`} className="block text-sm font-medium">
                {t('tree.ownValues')}
              </label>
              <input
                id={`${id}-values`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={valuesText}
                onChange={(event) => setValuesText(event.target.value)}
                placeholder={t(`tree.${mode}.placeholder`)}
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
                  dir="ltr"
                  value={memberText[field]}
                  onChange={(event) => setMemberText({ ...memberText, [field]: event.target.value })}
                  aria-invalid={inputError?.field === field}
                  aria-describedby={describedBy(field)}
                  className={`mt-1 ${inputClass(field)}`}
                />
              </div>
            ))}
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThese')}
            </button>
          </div>
          <p id={`${id}-input-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t(`tree.${mode}.hint`, { nodes: MAX_NODES, max: MAX_VALUE })} />
          </p>
          {inputError && (
            <p id={`${id}-input-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError.message} />
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
