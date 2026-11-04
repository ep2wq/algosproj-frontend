import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { DP_NS, type DpT } from './dpI18n'
import { coinFrames, coinText, houseFrames, stairsFrames, type DpRowFrame } from './dpRowFrames'
import { joinAnd } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import { useCentreCells, useScrollCue } from './useScrollCue'

// Limits so the row stays short (the problems allow far more; the hints say so).
const MAX_N = 15
const MAX_HOUSES = 10
const MAX_COINS = 4
const MAX_COIN = 12
const MAX_AMOUNT = 12

export type DpRowMode = 'stairs' | 'house' | 'coins'

type RowInput = { mode: 'stairs'; n: number } | { mode: 'house'; values: number[] } | { mode: 'coins'; amount: number; coins: number[] }

// The row's name and its index letter, as in each lesson's example table.
const NAMES = { stairs: ['ways', 'n'], house: ['best', 'i'], coins: ['best', 'x'] }
const HOUSE_ROW = 'v'

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomInput(mode: DpRowMode): RowInput {
  const roll = Math.random()
  if (mode === 'stairs') return { mode, n: randomInt(4, 9) }
  if (mode === 'house') {
    if (roll < 0.15) return { mode, values: [5, 1, 1, 5] }
    if (roll < 0.25) return { mode, values: [2, 3, 2] }
    return { mode, values: Array.from({ length: randomInt(4, 8) }, () => randomInt(0, 20)) }
  }
  if (roll < 0.15) return { mode, amount: 6, coins: [1, 3, 4] }
  if (roll < 0.25) return { mode, amount: 11, coins: [1, 2, 5] }
  if (roll < 0.35) return { mode, amount: 7, coins: [2, 4] }
  const coins = new Set<number>()
  const count = randomInt(2, 3)
  while (coins.size < count) coins.add(randomInt(1, 6))
  return { mode, amount: randomInt(5, MAX_AMOUNT), coins: [...coins].sort((a, b) => a - b) }
}

function framesFor(input: RowInput, t: DpT): DpRowFrame[] {
  if (input.mode === 'stairs') return stairsFrames(input.n, t)
  if (input.mode === 'house') return houseFrames(input.values, t)
  return coinFrames(input, t)
}

const isWhole = (part: string) => /^\d+$/.test(part)
const split = (text: string) => text.split(/[\s,]+/).filter(Boolean)

// Returns the input, or the field and message of the error to show.
function parseInput(mode: DpRowMode, first: string, second: string, t: DpT): RowInput | { field: 1 | 2; error: string } {
  if (mode === 'stairs') {
    const text = first.trim()
    if (!isWhole(text) || Number(text) < 1 || Number(text) > MAX_N) return { field: 1, error: t('binaryString.invalidN', { max: MAX_N }) }
    return { mode, n: Number(text) }
  }
  if (mode === 'house') {
    const parts = split(first)
    if (parts.length === 0) return { field: 1, error: t('common.atLeastOneNumber') }
    if (parts.length > MAX_HOUSES) return { field: 1, error: t('common.atMostNumbers', { count: MAX_HOUSES }) }
    if (parts.some((part) => !isWhole(part) || Number(part) > 99)) return { field: 1, error: t('dpRow.house.invalid') }
    return { mode, values: parts.map(Number) }
  }
  const parts = split(first)
  const coins = parts.map(Number)
  if (parts.length === 0 || parts.length > MAX_COINS || parts.some((part) => !isWhole(part)) || coins.some((c) => c < 1 || c > MAX_COIN) || new Set(coins).size !== coins.length) {
    return { field: 1, error: t('dpRow.coins.coinsInvalid', { maxCoins: MAX_COINS, maxValue: MAX_COIN }) }
  }
  const amount = second.trim()
  if (!isWhole(amount) || Number(amount) > MAX_AMOUNT) return { field: 2, error: t('dpRow.coins.amountInvalid', { max: MAX_AMOUNT }) }
  return { mode, amount: Number(amount), coins }
}

function cellClass(frame: DpRowFrame, index: number) {
  if (frame.done && index === frame.cells.length - 1) return 'border-pass bg-pass text-inverse'
  if (frame.current === index) return 'border-warn bg-warn text-inverse'
  if (frame.reads.includes(index)) return 'border-dashed border-accent bg-surface text-ink'
  if (frame.cells[index] === null) return 'border-line bg-paper text-muted'
  return 'border-muted bg-surface text-ink'
}

// The whole state in words: the house values or coins, the row, the cell being computed and what it reads.
function rowLabel(input: RowInput, frame: DpRowFrame, t: DpT) {
  const [name, index] = NAMES[input.mode]
  const inf = input.mode === 'coins' ? input.amount + 1 : Infinity
  const cell = (i: number) => `${name}[${i}]`
  const cells = frame.cells.map((value) => (value === null ? t('shared.empty') : value >= inf ? t('dpRow.infLabel') : String(value)))
  const parts = []
  if (input.mode === 'house') parts.push(t('dpRow.labelHouses', { n: input.values.length, values: input.values.join(t('common.listSeparator')) }))
  if (input.mode === 'coins') {
    parts.push(t('dpRow.labelCoins', { coins: input.coins.join(t('common.listSeparator')) }))
    if (frame.coin !== null) parts.push(t('dpRow.labelTrying', { coin: input.coins[frame.coin] }))
  }
  parts.push(t('dpRow.labelRow', { name, index, last: frame.cells.length - 1, cells: cells.join(t('common.listSeparator')) }))
  if (frame.current !== null) {
    parts.push(frame.reads.length > 0 ? t('shared.labelCurrent', { cell: cell(frame.current), reads: joinAnd(t, frame.reads.map(cell)) }) : t('shared.labelCurrentAlone', { cell: cell(frame.current) }))
  }
  if (frame.done) parts.push(t('shared.labelAnswer', { cell: cell(frame.cells.length - 1), value: cells[cells.length - 1] }))
  return parts.join(' ')
}

// A one-row DP table filled left to right: climbing stairs, house robber or coin change.
export default function DpRowVisual({ mode }: { mode: DpRowMode }) {
  const { t } = useTranslation(DP_NS, { nsMode: 'fallback' })
  const id = useId()
  const [input, setInput] = useState(() => randomInput(mode))
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [inputError, setInputError] = useState<{ field: 1 | 2; error: string } | null>(null)

  const frames = useMemo(() => framesFor(input, t), [input, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo, playing } = playback
  const current = frames[Math.min(step, lastStep)]
  const last = current.cells.length - 1
  const [name, index] = NAMES[mode]
  const inf = input.mode === 'coins' ? input.amount + 1 : Infinity
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const focusIndex = current.current ?? (current.done ? last : 0)
  useCentreCells(scrollRef, focusIndex, focusIndex, input)

  function restart(next: RowInput) {
    setInput(next)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseInput(mode, first, second, t)
    if ('error' in parsed) {
      setInputError(parsed)
      return
    }
    setInputError(null)
    restart(parsed)
  }

  const errorId = `${id}-error`
  const describedBy = (field: 1 | 2) => `${id}-hint${inputError?.field === field ? ` ${errorId}` : ''}`
  const fieldClass = (field: 1 | 2) =>
    `mt-1 block w-full min-w-0 rounded border bg-surface px-3 py-1.5 font-mono text-sm ${inputError?.field === field ? 'border-fail' : 'border-field hover:border-muted'}`

  return (
    <div className="mt-4 max-w-5xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SpeedSelect playback={playback} />
      </div>

      {input.mode === 'coins' && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5" dir="ltr">
          <span className="me-1 text-sm font-medium">{t('dpRow.coinsTitle')}</span>
          {input.coins.map((coin, k) => (
            <span
              key={k}
              className={`rounded border-2 px-2 py-0.5 font-mono text-sm tabular-nums ${current.coin === k ? 'border-warn bg-warn font-bold text-inverse' : 'border-muted bg-surface text-ink'}`}
            >
              {coin}
            </span>
          ))}
        </div>
      )}

      <div
        tabIndex={0}
        role="region"
        aria-label={t('shared.region')}
        dir="ltr"
        ref={scrollRef}
        className={`mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
      >
        <div role="img" aria-label={rowLabel(input, current, t)} className="mx-auto flex w-max gap-x-1.5">
          <div className="flex flex-col items-end font-mono text-xs text-muted">
            {input.mode === 'house' && <span className="mb-1 flex h-8 items-center">{HOUSE_ROW}</span>}
            <span className="h-4" />
            <span className="mt-0.5 flex h-10 items-center">{name}</span>
            <span className="mt-0.5">{index}</span>
          </div>
          {current.cells.map((cell, i) => (
            <div key={i} data-index={i} className="flex w-10 flex-col items-center">
              {input.mode === 'house' && (
                <span
                  className={`mb-1 flex size-8 items-center justify-center rounded border-2 text-xs tabular-nums ${
                    i === 0 ? 'border-transparent' : current.house === i ? 'border-dashed border-accent bg-surface text-ink' : 'border-line bg-paper text-ink'
                  }`}
                >
                  {i === 0 ? '' : input.values[i - 1]}
                </span>
              )}
              <span className="h-4 text-xs font-semibold text-ink">{current.done && i === last ? '✓' : current.current === i ? index : ''}</span>
              <span
                className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 text-sm font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${cellClass(current, i)}`}
              >
                {cell === null ? '' : coinText(cell, inf)}
              </span>
              <span className="mt-0.5 font-mono text-xs text-muted tabular-nums">{i}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-warn bg-warn" aria-hidden="true" />
          {t('shared.legendCurrent')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-dashed border-accent bg-surface" aria-hidden="true" />
          {t('shared.legendRead')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-pass bg-pass" aria-hidden="true" />
          {t('shared.legendAnswer')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-5 rounded border-2 border-line bg-paper" aria-hidden="true" />
          {t('shared.legendEmpty')}
        </li>
        <li>
          <TextWithCode text={t('dpRow.legendIndex', { index })} />
        </li>
        {mode === 'house' && (
          <li>
            <TextWithCode text={t('dpRow.legendHouses')} />
          </li>
        )}
        {mode === 'coins' && (
          <li>
            <TextWithCode text={t('dpRow.legendInf')} />
          </li>
        )}
      </ul>

      {current.output !== null && (
        <p className="mt-3 inline-block rounded-lg border border-line bg-surface px-3 py-2 font-semibold">
          {t('common.output')} <span className="font-mono">{current.output}</span>
        </p>
      )}

      {/* Quiet while playing (a sentence per step would flood a screen reader); read out when paused. */}
      <p aria-live={playing ? 'off' : 'polite'} className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={() => restart(randomInput(mode))} className={buttonClass}>
          {t('common.newRandomExample')}
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-40">
              <label htmlFor={`${id}-first`} className="block text-sm font-medium">
                <TextWithCode text={mode === 'stairs' ? t('dpRow.stairs.inputLabel') : mode === 'house' ? t('dpRow.house.inputLabel') : t('dpRow.coins.coinsLabel')} />
              </label>
              <input
                id={`${id}-first`}
                type="text"
                inputMode={mode === 'stairs' ? 'numeric' : undefined}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                value={first}
                onChange={(event) => setFirst(event.target.value)}
                placeholder={mode === 'stairs' ? t('dpRow.stairs.placeholder') : mode === 'house' ? t('dpRow.house.placeholder') : t('dpRow.coins.coinsPlaceholder')}
                aria-invalid={inputError?.field === 1}
                aria-describedby={describedBy(1)}
                className={fieldClass(1)}
              />
            </div>
            {mode === 'coins' && (
              <div className="w-28 shrink-0">
                <label htmlFor={`${id}-second`} className="block text-sm font-medium">
                  {t('dpRow.coins.amountLabel')}
                </label>
                <input
                  id={`${id}-second`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  dir="ltr"
                  value={second}
                  onChange={(event) => setSecond(event.target.value)}
                  placeholder={t('dpRow.coins.amountPlaceholder')}
                  aria-invalid={inputError?.field === 2}
                  aria-describedby={describedBy(2)}
                  className={fieldClass(2)}
                />
              </div>
            )}
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThis')}
            </button>
          </div>
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode
              text={
                mode === 'stairs'
                  ? t('dpRow.stairs.hint', { max: MAX_N })
                  : mode === 'house'
                    ? t('dpRow.house.hint', { max: MAX_HOUSES })
                    : t('dpRow.coins.hint', { maxCoins: MAX_COINS, maxValue: MAX_COIN, maxAmount: MAX_AMOUNT })
              }
            />
          </p>
          {inputError && (
            <p id={errorId} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError.error} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export function StairsVisual() {
  return <DpRowVisual mode="stairs" />
}

export function HouseRobberVisual() {
  return <DpRowVisual mode="house" />
}

export function CoinChangeVisual() {
  return <DpRowVisual mode="coins" />
}
