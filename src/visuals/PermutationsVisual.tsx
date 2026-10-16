import { useId, useMemo, useState, type FormEvent } from 'react'
import CallTreeDiagram, { CallTreeLegend, type CallMark } from './CallTreeDiagram'
import type { CallNode } from './callTree'
import { permutationFrames, type PermFrame } from './permutationFrames'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'

// The problem permutes the numbers 1 to n with n up to 6; the visual takes 1 to 4 items of
// one letter or digit each, so the tree (at most 24 leaves) stays readable.
const MAX_ITEMS = 4

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// Usually 1 2 3 like the problem, sometimes letters, sometimes a mixed order.
function randomItems() {
  const n = [2, 3, 3, 3, 4][randomInt(0, 4)]
  const shape = Math.random()
  if (shape < 0.5) return Array.from({ length: n }, (_, i) => String(i + 1))
  if (shape < 0.75) return 'ABCD'.slice(0, n).split('')
  const pool = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789'.split('')
  const items: string[] = []
  while (items.length < n) {
    const item = pool[randomInt(0, pool.length - 1)]
    if (!items.includes(item)) items.push(item)
  }
  return items
}

// Returns the items, or an error message to show.
function parseItems(text: string): string[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return `Enter 1 to ${MAX_ITEMS} items, separated by spaces or commas.`
  const long = parts.find((part) => part.length > 1)
  if (long !== undefined) return `Each item must be one letter or digit: "${long}" is longer. Separate the items with spaces or commas.`
  if (parts.some((part) => !/^[A-Za-z0-9]$/.test(part))) return 'Use only letters and digits as items.'
  if (parts.length > MAX_ITEMS) return `Enter at most ${MAX_ITEMS} items, so the tree stays readable.`
  const repeated = parts.find((part, index) => parts.indexOf(part) !== index)
  if (repeated !== undefined) return `The items must be distinct: ${repeated} appears more than once.`
  return parts
}

function markFor(frame: PermFrame) {
  const printed = new Set(frame.printed)
  const running = frame.stack[frame.stack.length - 1]
  return (id: number): CallMark => {
    if (printed.has(id)) return 'printed'
    if (id === running) return 'running'
    if (frame.stack.includes(id)) return 'open'
    return 'returned'
  }
}

function treeLabel(frame: PermFrame, tree: CallNode[]) {
  const running = frame.stack.length === 0 ? 'none, the search is over' : tree[frame.stack[frame.stack.length - 1]].label
  return `Call tree: ${frame.shown} of ${tree.length} calls made. Running call: ${running}. Printed so far: ${frame.results.length === 0 ? 'nothing' : frame.results.join(', ')}.`
}

function itemNote(frame: PermFrame, index: number) {
  if (frame.focus === index) return frame.kind === 'undo' ? 'undone' : 'chosen'
  if (frame.skipped.includes(index)) return 'skipped'
  return frame.used[index] ? 'used' : 'free'
}

// The backtracking for "Permutations": the items with their used markers, cur, the call tree
// and the printed lines, one choose, explore or undo per step.
export default function PermutationsVisual() {
  const id = useId()
  const [items, setItems] = useState(['1', '2', '3'])
  const [itemsText, setItemsText] = useState('1 2 3')
  const [inputError, setInputError] = useState('')

  const { tree, frames } = useMemo(() => permutationFrames(items), [items])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]
  const total = frames[lastStep].results.length

  function restart(next: string[]) {
    setItems(next)
    setItemsText(next.join(' '))
    setInputError('')
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseItems(itemsText)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    restart(parsed)
  }

  const callStack = current.stack.map((call) => tree[call].label)

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded border border-line bg-surface p-3">
          <p className="text-sm font-medium">Items and their used markers</p>
          <ul
            aria-label={`Items: ${items.map((item, index) => `${item} ${itemNote(current, index)}`).join(', ')}.`}
            className="mt-2 flex flex-wrap gap-2"
          >
            {items.map((item, index) => {
              const note = itemNote(current, index)
              return (
                <li key={item} className="flex w-14 flex-col items-center">
                  <span
                    className={`flex size-10 items-center justify-center rounded font-mono text-lg font-semibold motion-safe:transition-colors motion-safe:duration-300 ${
                      current.focus === index ? 'border-4 border-warn' : 'border-2'
                    } ${current.used[index] ? 'border-accent bg-accent-soft text-ink' : 'border-muted bg-surface text-ink'}`}
                  >
                    {item}
                  </span>
                  <span className={`mt-0.5 text-xs ${note === 'free' ? 'text-muted' : 'font-semibold text-ink'}`}>{note}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="min-w-0 rounded border border-line bg-surface p-3">
          <p className="text-sm font-medium">cur, the partial permutation</p>
          <ol aria-label={`cur: ${current.cur.length === 0 ? 'empty' : current.cur.map((i) => items[i]).join(', ')}.`} className="mt-2 flex flex-wrap gap-2">
            {items.map((_, position) => {
              const placed = current.cur[position]
              return (
                <li key={position} className="flex w-10 flex-col items-center">
                  <span
                    className={`flex size-10 items-center justify-center rounded border-2 font-mono text-lg font-semibold ${
                      placed === undefined ? 'border-dashed border-line text-muted' : 'border-accent bg-accent-soft text-ink'
                    }`}
                  >
                    {placed === undefined ? '' : items[placed]}
                  </span>
                  <span className="mt-0.5 text-xs text-muted tabular-nums">{position + 1}</span>
                </li>
              )
            })}
          </ol>
          <p className="mt-1 text-xs text-muted">Small numbers: positions. Depth: {current.depth === null ? '-' : current.depth}</p>
        </div>
      </div>

      <p className="mt-3 text-sm">
        <span className="font-medium">Call stack</span> <span className="text-muted">(first call on the left)</span>:{' '}
        <span className="font-mono break-all">{callStack.length === 0 ? 'empty' : callStack.join(' → ')}</span>
      </p>

      <CallTreeDiagram nodes={tree} shown={current.shown} markOf={markFor(current)} label={treeLabel(current, tree)} />
      <CallTreeLegend />
      <p className="mt-1 text-xs text-muted">Each box shows cur for that call. A used item is skipped, so every call has one child fewer than its parent.</p>

      <p className="mt-3 text-sm font-medium">
        Results so far ({current.results.length} of {total})
      </p>
      <ol aria-label={`Results so far: ${current.results.length === 0 ? 'none' : current.results.join(', ')}.`} className="mt-1 flex min-h-10 flex-wrap items-center gap-1 rounded border border-line bg-surface p-1.5">
        {current.results.length === 0 && <li className="px-1 text-sm text-muted">none yet</li>}
        {current.results.map((result, index) => {
          const isNew = current.kind === 'print' && index === current.results.length - 1
          return (
            <li key={result} className={`rounded border px-1.5 py-0.5 font-mono text-sm ${isNew ? 'border-pass bg-pass text-inverse' : 'border-muted bg-surface'}`}>
              {result}
              {isNew && <span className="ms-1 font-sans text-xs">new</span>}
            </li>
          )
        })}
      </ol>

      <p aria-live="polite" className="mt-3 min-h-12 rounded bg-accent-soft px-3 py-2 text-sm">
        {current.description}
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomItems())} className={buttonClass}>
          New random example
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1">
          <label htmlFor={`${id}-items`} className="block text-sm font-medium">
            Your own items
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-items`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={itemsText}
              onChange={(event) => setItemsText(event.target.value)}
              placeholder="e.g. A B C"
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-items-hint${inputError ? ` ${id}-items-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              Use these
            </button>
          </div>
          <p id={`${id}-items-hint`} className="mt-1 text-xs text-muted">
            1 to {MAX_ITEMS} different items, each one letter or digit, separated by spaces or commas. They are tried in the order you type them, so 1 2 3
            gives the problem&apos;s lexicographic order. (The problem uses the numbers 1 to n, with n up to 6.)
          </p>
          {inputError && (
            <p id={`${id}-items-error`} role="alert" className="mt-1 text-sm text-fail">
              {inputError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
