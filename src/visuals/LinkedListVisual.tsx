import { useId, useMemo, useState, type FormEvent } from 'react'
import { cycleFrames, middleFrames, reverseFrames, type ListFrame, type ListMode } from './linkedListFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

type Source = { values: number[]; pos: number }

function randomValues(min: number, max: number) {
  return Array.from({ length: randomInt(min, max) }, () => randomInt(-9, 30))
}

// The problems' limits: up to 1000 values from -1000000 to 1000000; the visual shows at most 12.
const MAX_NODES = 12
const MAX_VALUE = 1000000

function parseValues(text: string, minCount: number): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length < minCount) return 'Enter at least one number.'
  if (parts.length > MAX_NODES) return `Enter at most ${MAX_NODES} numbers.`
  if (parts.some((part) => !/^-?\d+$/.test(part) || Math.abs(Number(part)) > MAX_VALUE)) {
    return 'Use whole numbers from -1000000 to 1000000, separated by spaces or commas.'
  }
  return parts.map(Number)
}

function parsePos(text: string, n: number): number | string {
  const trimmed = text.trim()
  if (n === 0) return trimmed === '-1' ? -1 : 'With no numbers, pos must be -1.'
  if (!/^-?\d+$/.test(trimmed) || Number(trimmed) < -1 || Number(trimmed) > n - 1) {
    return `pos must be -1 (no cycle) or a position from 0 to ${n - 1}.`
  }
  return Number(trimmed)
}

const MODES = {
  reverse: {
    frames: (source: Source) => reverseFrames(source.values),
    random: (): Source => ({ values: randomValues(3, 7), pos: -1 }),
    minCount: 0,
    placeholder: 'e.g. 1 2 3 4',
    hint: '0 to 12 whole numbers from -1000000 to 1000000, as in the problem. Leave it empty for an empty list.',
  },
  middle: {
    frames: (source: Source) => middleFrames(source.values),
    random: (): Source => ({ values: randomValues(4, 9), pos: -1 }),
    minCount: 1,
    placeholder: 'e.g. 1 2 3 4 5 6',
    hint: '1 to 12 whole numbers from -1000000 to 1000000, as in the problem. For an even count, the middle is the second of the two middle nodes.',
  },
  cycle: {
    frames: (source: Source) => cycleFrames(source.values, source.pos),
    random: (): Source => {
      const values = randomValues(3, 8)
      return { values, pos: Math.random() < 0.3 ? -1 : randomInt(0, values.length - 1) }
    },
    minCount: 0,
    placeholder: 'e.g. 3 2 0 -4',
    hint: '0 to 12 whole numbers from -1000000 to 1000000, and pos: the position the last node links back to, or -1 for none, as in the problem.',
  },
}

// Diagram geometry in pixels. Node boxes grow with the longest value.
const GAP = 36
const NULL_W = 44
const LABEL_LINE = 14
const BOX_TOP = 2 * LABEL_LINE + 8
const BOX_H = 36
const BOX_MID = BOX_TOP + BOX_H / 2
const BOX_BOTTOM = BOX_TOP + BOX_H
const INDEX_Y = BOX_BOTTOM + 14
const LOOP_DEPTH = 34
const SELF_LOOP = 30

function layout(frame: ListFrame) {
  const n = frame.values.length
  const longest = Math.max(1, ...frame.values.map((value) => String(value).length))
  const nodeW = Math.max(44, 18 + 9 * longest)
  const tail = n - 1
  const rightNull =
    n === 0 || (frame.next[tail] === null && !frame.flipped[tail]) || frame.pointers.some((pointer) => pointer.at === 'null-right')
  let x = 0
  const leftNullX = frame.leftNull ? x : null
  if (frame.leftNull) x += NULL_W + GAP
  const nodeX = frame.values.map(() => {
    const left = x
    x += nodeW + GAP
    return left
  })
  const rightNullX = rightNull ? x : null
  if (rightNull) x += NULL_W + GAP
  // Cycle only: the tail's next goes back to an earlier node (or itself), drawn as a curve.
  const backLink = n > 0 && !frame.flipped[tail] && frame.next[tail] !== null ? frame.next[tail]! : null
  const height = INDEX_Y + 6 + (backLink === null ? 0 : LOOP_DEPTH)
  const loopRoom = backLink === tail ? SELF_LOOP : 0
  return { nodeW, nodeX, leftNullX, rightNullX, backLink, width: Math.max(x - GAP + loopRoom, NULL_W), height }
}

// Arrow colours: plain, already turned around (reverse) or the cycle link, changed this step.
// Class names are written out in full so Tailwind generates them.
const TONES = {
  muted: { line: 'stroke-muted', head: 'fill-muted' },
  accent: { line: 'stroke-accent', head: 'fill-accent' },
  warn: { line: 'stroke-warn', head: 'fill-warn' },
}
type Tone = keyof typeof TONES

function Arrow({ from, to, tone }: { from: number; to: number; tone: Tone }) {
  const dir = Math.sign(to - from)
  return <line x1={from} y1={BOX_MID} x2={to - 2 * dir} y2={BOX_MID} className={TONES[tone].line} strokeWidth={2} markerEnd={`url(#arrow-${tone})`} />
}

function listLabel(frame: ListFrame) {
  const { values, next } = frame
  if (values.length === 0) return 'The list is empty.'
  const nodes = values.map((value, i) => {
    const target = next[i] === null ? 'null' : `${values[next[i]!]} (index ${next[i]})`
    return `${value} (index ${i}) points to ${target}`
  })
  const pointers = frame.pointers.map((pointer) => {
    const where = typeof pointer.at === 'number' ? `${values[pointer.at]} (index ${pointer.at})` : 'null'
    return `${pointer.name} is at ${where}`
  })
  return `Nodes: ${nodes.join('; ')}. ${pointers.join(', ')}.`
}

function Diagram({ frame }: { frame: ListFrame }) {
  const geometry = layout(frame)
  const { nodeW, nodeX, leftNullX, rightNullX, backLink } = geometry
  const n = frame.values.length
  const labels = new Map<string, string[]>()
  for (const pointer of frame.pointers) {
    const key = String(pointer.at)
    labels.set(key, [...(labels.get(key) ?? []), pointer.name])
  }
  const watched = new Set(frame.pointers.filter((p) => p.name !== 'head' && p.name !== 'prev').map((p) => p.at))
  const tone = (i: number): Tone => (frame.changed === i ? 'warn' : frame.flipped[i] ? 'accent' : 'muted')

  function labelText(key: string, center: number) {
    const names = labels.get(key) ?? []
    return names.map((name, line) => (
      <text key={name} x={center} y={BOX_TOP - 6 - (names.length - 1 - line) * LABEL_LINE} textAnchor="middle" className="fill-ink text-xs font-semibold">
        {name}
      </text>
    ))
  }

  function nullBox(x: number, key: string) {
    return (
      <g key={key}>
        <rect x={x + 1} y={BOX_TOP + 1} width={NULL_W - 2} height={BOX_H - 2} rx={4} className="fill-paper stroke-line" strokeDasharray="4 3" strokeWidth={2} />
        <text x={x + NULL_W / 2} y={BOX_MID + 4} textAnchor="middle" className="fill-muted font-mono text-xs">
          null
        </text>
        {labelText(key, x + NULL_W / 2)}
      </g>
    )
  }

  return (
    <svg width={geometry.width} height={geometry.height} viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="block" aria-hidden="true">
      <defs>
        {(Object.keys(TONES) as Tone[]).map((t) => (
          <marker key={t} id={`arrow-${t}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className={TONES[t].head} />
          </marker>
        ))}
      </defs>

      {leftNullX !== null && nullBox(leftNullX, 'null-left')}
      {rightNullX !== null && nullBox(rightNullX, 'null-right')}

      {frame.values.map((value, i) => {
        const x = nodeX[i]
        const center = x + nodeW / 2
        const box =
          frame.highlight === i
            ? 'fill-pass stroke-pass'
            : watched.has(i)
              ? 'fill-white stroke-warn'
              : 'fill-white stroke-muted'
        return (
          <g key={i}>
            <rect x={x + 1} y={BOX_TOP + 1} width={nodeW - 2} height={BOX_H - 2} rx={4} strokeWidth={2} className={`${box} motion-safe:transition-colors motion-safe:duration-300`} />
            <text x={center} y={BOX_MID + 5} textAnchor="middle" className={`font-mono text-sm font-medium ${frame.highlight === i ? 'fill-white' : 'fill-ink'}`}>
              {value}
            </text>
            <text x={center} y={INDEX_Y} textAnchor="middle" className="fill-muted text-xs tabular-nums">
              {i}
            </text>
            {labelText(String(i), center)}
          </g>
        )
      })}

      {frame.values.map((_, i) => {
        const target = frame.next[i]
        const right = nodeX[i] + nodeW
        const left = nodeX[i]
        // Turned-around arrows (reverse) point left; the rest point right, except the
        // cycle's link back, which is the curve below.
        if (frame.flipped[i]) {
          if (target === null) return <Arrow key={i} from={left} to={leftNullX! + NULL_W} tone={tone(i)} />
          return <Arrow key={i} from={left} to={nodeX[target] + nodeW} tone={tone(i)} />
        }
        if (target === i + 1) return <Arrow key={i} from={right} to={nodeX[i + 1]} tone={tone(i)} />
        if (target === null) return <Arrow key={i} from={right} to={rightNullX!} tone={tone(i)} />
        return null
      })}

      {backLink !== null && (
        <path
          d={(() => {
            const right = nodeX[n - 1] + nodeW
            // A tail linking to itself: out of its right side and back into its bottom-right
            // corner, clear of the position number.
            if (backLink === n - 1) {
              return `M ${right} ${BOX_MID + 6} C ${right + SELF_LOOP} ${BOX_MID + 6}, ${right + SELF_LOOP} ${BOX_BOTTOM + 24}, ${right - 10} ${BOX_BOTTOM + 2}`
            }
            // Otherwise down from near the tail's right edge, back along below the position
            // numbers, and up into near node pos's left edge, with rounded corners.
            const from = right - 8
            const to = nodeX[backLink] + 8
            const y = BOX_BOTTOM + LOOP_DEPTH - 4
            return `M ${from} ${BOX_BOTTOM} L ${from} ${y - 8} Q ${from} ${y} ${from - 8} ${y} L ${to + 8} ${y} Q ${to} ${y} ${to} ${y - 8} L ${to} ${BOX_BOTTOM + 2}`
          })()}
          fill="none"
          strokeWidth={2}
          className={TONES.accent.line}
          markerEnd="url(#arrow-accent)"
        />
      )}
    </svg>
  )
}

// One diagram, three algorithms: reverse a list, find its middle, detect a cycle.
export default function LinkedListVisual({ mode }: { mode: ListMode }) {
  const id = useId()
  const config = MODES[mode]
  const [source, setSource] = useState(config.random)
  const [valuesText, setValuesText] = useState('')
  const [posText, setPosText] = useState('-1')
  const [inputError, setInputError] = useState<{ field: 'values' | 'pos'; message: string } | null>(null)

  const frames = useMemo(() => config.frames(source), [config, source])
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
    const pos = mode === 'cycle' ? parsePos(posText, values.length) : -1
    if (typeof pos === 'string') {
      setInputError({ field: 'pos', message: pos })
      return
    }
    setInputError(null)
    restart({ values, pos })
  }

  const describedBy = (field: 'values' | 'pos') =>
    `${id}-input-hint${inputError?.field === field ? ` ${id}-input-error` : ''}`
  const inputClass = (field: 'values' | 'pos') =>
    `block w-full min-w-0 rounded border bg-white px-3 py-1.5 font-mono text-sm ${
      inputError?.field === field ? 'border-fail' : 'border-line hover:border-muted'
    }`

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Linked list diagram, scrolls sideways when it is wider than the screen"
        className="mt-4 overflow-x-auto rounded border border-line bg-white p-3"
      >
        <div role="img" aria-label={listLabel(current)} className="w-max">
          <Diagram frame={current} />
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border-2 border-warn bg-white" aria-hidden="true" />
          {mode === 'reverse' ? 'Node under curr or next' : 'Node under slow or fast'}
        </li>
        {mode === 'reverse' ? (
          <>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-accent" aria-hidden="true" />
              Arrow already turned around
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-warn" aria-hidden="true" />
              Arrow changed in this step
            </li>
          </>
        ) : (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm border border-pass bg-pass" aria-hidden="true" />
            {mode === 'middle' ? 'Middle node' : 'Where slow and fast meet'}
          </li>
        )}
        <li>Small numbers: positions.</li>
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
              <label htmlFor={`${id}-input`} className="block text-sm font-medium">
                Your own numbers
              </label>
              <input
                id={`${id}-input`}
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
            {mode === 'cycle' && (
              <div className="w-20">
                <label htmlFor={`${id}-pos`} className="block text-sm font-medium">
                  pos
                </label>
                <input
                  id={`${id}-pos`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={posText}
                  onChange={(event) => setPosText(event.target.value)}
                  aria-invalid={inputError?.field === 'pos'}
                  aria-describedby={describedBy('pos')}
                  className={`mt-1 ${inputClass('pos')}`}
                />
              </div>
            )}
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use this
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

export function ReverseListVisual() {
  return <LinkedListVisual mode="reverse" />
}

export function MiddleVisual() {
  return <LinkedListVisual mode="middle" />
}

export function CycleVisual() {
  return <LinkedListVisual mode="cycle" />
}
