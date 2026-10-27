import { useId, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { binarySearchFrames } from './binarySearchFrames'
import type { T } from './i18n'
import PlaybackControls, { buttonClass, SpeedSelect } from './PlaybackControls'
import { usePlayback } from './usePlayback'
import SearchCells from './SearchCells'

const MAX_NUMBERS = 15

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// 10 distinct sorted numbers; the target is in the array about 2 times out of 3.
function randomCase() {
  const values = new Set<number>()
  while (values.size < 10) values.add(randomInt(1, 99))
  const array = [...values].sort((a, b) => a - b)
  let target = array[randomInt(0, array.length - 1)]
  if (Math.random() < 1 / 3) {
    do target = randomInt(1, 99)
    while (values.has(target))
  }
  return { array, target }
}

// Returns the sorted numbers, or an error message to show.
function parseNumbers(text: string, t: T): number[] | string {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 0) return t('common.atLeastOneNumber')
  if (parts.length > MAX_NUMBERS) return t('common.atMostNumbers', { count: MAX_NUMBERS })
  if (parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1 || Number(part) > 99)) {
    return t('binarySearch.invalid')
  }
  const numbers = parts.map(Number)
  if (new Set(numbers).size !== numbers.length) return t('binarySearch.unique')
  return numbers.sort((a, b) => a - b)
}

function parseTarget(text: string, t: T): number | string {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1 || Number(trimmed) > 99) return t('binarySearch.targetInvalid')
  return Number(trimmed)
}

const LEGEND = [
  { key: 'middle', style: 'border-warn bg-warn' },
  { key: 'found', style: 'border-pass bg-pass' },
  { key: 'possible', style: 'border-muted bg-surface' },
  { key: 'ruledOut', style: 'border-line bg-paper' },
]

export default function BinarySearchVisual() {
  const { t } = useTranslation('visuals')
  const id = useId()
  const [initial] = useState(randomCase)
  const [array, setArray] = useState(initial.array)
  const [target, setTarget] = useState(initial.target)
  const [targetText, setTargetText] = useState(String(initial.target))
  const [targetError, setTargetError] = useState('')
  const [customText, setCustomText] = useState('')
  const [inputError, setInputError] = useState('')

  const frames = useMemo(() => binarySearchFrames(array, target, t), [array, target, t])
  const playback = usePlayback(frames.length)
  const { step, lastStep, goTo } = playback
  const current = frames[Math.min(step, lastStep)]

  function handleRandom() {
    const next = randomCase()
    setArray(next.array)
    setTarget(next.target)
    setTargetText(String(next.target))
    setTargetError('')
    goTo(0)
  }

  function handleTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseTarget(targetText, t)
    if (typeof parsed === 'string') {
      setTargetError(parsed)
      return
    }
    setTargetError('')
    setTarget(parsed)
    goTo(0)
  }

  function handleCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseNumbers(customText, t)
    if (typeof parsed === 'string') {
      setInputError(parsed)
      return
    }
    setInputError('')
    setArray(parsed)
    goTo(0)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <form onSubmit={handleTarget} noValidate>
          <label htmlFor={`${id}-target`} className="text-sm font-medium">
            <TextWithCode text={t('binarySearch.target')} />
          </label>
          <input
            id={`${id}-target`}
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={targetText}
            onChange={(event) => setTargetText(event.target.value)}
            aria-invalid={Boolean(targetError)}
            aria-describedby={targetError ? `${id}-target-error` : undefined}
            className={`ms-2 w-16 rounded border bg-surface px-2 py-1 text-sm ${
              targetError ? 'border-fail' : 'border-field hover:border-muted'
            }`}
          />
          <button type="submit" className={`${buttonClass} ms-2 py-1`}>
            {t('binarySearch.search')}
          </button>
          {targetError && (
            <p id={`${id}-target-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={targetError} />
            </p>
          )}
        </form>
        <SpeedSelect playback={playback} />
      </div>

      <SearchCells
        frame={current}
        regionLabel={t('binarySearch.region')}
        imageLabel={t('binarySearch.label', { values: current.array.join(', '), target })}
      />

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LEGEND.map(({ key, style }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-5 rounded border-2 ${style}`} aria-hidden="true" />
            {t(`binarySearch.legend.${key}`)}
          </li>
        ))}
        <li>
          <TextWithCode text={t('binarySearch.pointers')} />
        </li>
      </ul>

      <p aria-live="polite" className="mt-3 min-h-12 rounded-lg bg-accent-soft px-3 py-2 text-sm">
        <TextWithCode text={current.description} />
      </p>

      <PlaybackControls playback={playback} />

      <div className="mt-5 flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line pt-4">
        <button type="button" onClick={handleRandom} className={buttonClass}>
          <TextWithCode text={t('common.newRandomArray')} />
        </button>
        <form onSubmit={handleCustom} noValidate className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-numbers`} className="block text-sm font-medium">
            {t('common.yourOwnNumbers')}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id={`${id}-numbers`}
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              placeholder={t('binarySearch.placeholder')}
              aria-invalid={Boolean(inputError)}
              aria-describedby={`${id}-numbers-hint${inputError ? ` ${id}-numbers-error` : ''}`}
              className={`block w-full min-w-0 rounded border bg-surface px-3 py-1.5 text-sm ${
                inputError ? 'border-fail' : 'border-field hover:border-muted'
              }`}
            />
            <button type="submit" className={`${buttonClass} shrink-0`}>
              {t('common.useThese')}
            </button>
          </div>
          <p id={`${id}-numbers-hint`} className="mt-1 text-xs text-muted">
            <TextWithCode text={t('binarySearch.hint', { count: MAX_NUMBERS })} />
          </p>
          {inputError && (
            <p id={`${id}-numbers-error`} role="alert" className="mt-1 text-sm text-fail">
              <TextWithCode text={inputError} />
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
