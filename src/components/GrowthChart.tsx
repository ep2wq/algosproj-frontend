import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../i18n'
import { TextWithCode } from './LessonBody'

// The growth classes from the lessons, drawn from fixed maths (no measurements, nothing fetched).
// Each curve has its own dash and its own label, so no curve is told apart by colour. The chart is
// a picture of the table next to it: the slider moves n for both.
const CLASSES = [
  { label: 'O(1)', dash: '', f: () => 1 },
  { label: 'O(log n)', dash: '1 3', f: (n: number) => Math.log2(n) },
  { label: 'O(n)', dash: '6 3', f: (n: number) => n },
  { label: 'O(n log n)', dash: '10 3 2 3', f: (n: number) => n * Math.log2(n) },
  { label: 'O(n²)', dash: '14 3', f: (n: number) => n * n },
  { label: 'O(2ⁿ)', dash: '3 3', f: (n: number) => 2 ** n },
  { label: 'O(n!)', dash: '12 4', f: factorial },
]

const N_MIN = 1
const N_MAX = 20
const MAX = 100 // operations at the top of the chart; steeper curves leave it
const AXIS = 'n' // the x-axis: maths, the same in both languages

// n! between whole numbers: the curve between them on a log scale, so it bends smoothly.
function factorial(n: number): number {
  const whole = Math.floor(n)
  let value = 1
  for (let k = 2; k <= whole; k++) value *= k
  return whole === n ? value : value * (whole + 1) ** (n - whole)
}

// Chart coordinates in percent: x from n, y from the count (0 at the top).
const x = (n: number) => ((n - N_MIN) / (N_MAX - N_MIN)) * 100
const y = (value: number) => 100 - (Math.min(value, MAX) / MAX) * 100

// The curve up to where it leaves the top, and where that is (n), if it does.
function curve(f: (n: number) => number) {
  const points: string[] = []
  for (let n = N_MIN; n <= N_MAX + 1e-9; n += 0.1) {
    if (f(n) > MAX) {
      // Step back to the crossing, to a tenth.
      let exit = n - 0.1
      while (f(exit + 0.01) <= MAX) exit += 0.01
      points.push(`${x(exit)},0`)
      return { points: points.join(' '), exit }
    }
    points.push(`${x(n)},${y(f(n))}`)
  }
  return { points: points.join(' '), exit: null }
}

const CURVES = CLASSES.map((c) => ({ ...c, ...curve(c.f) }))

// Labels of the curves that reach the end: at their end, pushed apart (at least 9% of the height)
// so the flat ones near the bottom don't overlap.
const END_LABELS = (() => {
  const ends = CURVES.filter((c) => c.exit === null).map((c) => ({ label: c.label, top: y(c.f(N_MAX)) }))
  ends.sort((a, b) => b.top - a.top)
  for (let i = 1; i < ends.length; i++) ends[i].top = Math.min(ends[i].top, ends[i - 1].top - 9)
  return ends
})()

// Labels of the curves that leave the top: where they leave, one row each so neighbours don't touch.
const EXIT_LABELS = CURVES.filter((c) => c.exit !== null).map((c, row) => ({ label: c.label, left: x(c.exit!), row }))
const ROW_GAP = ['mb-1', 'mb-5', 'mb-9']

function round(value: number) {
  return value < 1000 ? Math.round(value * 10) / 10 : value
}

// One swatch per class (its dash), for the table.
function Swatch({ dash }: { dash: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 4" className="h-1 w-7 shrink-0 text-muted">
      <line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray={dash || undefined} />
    </svg>
  )
}

export default function GrowthChart() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const id = useId()
  const [n, setN] = useState(10)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      {/* Maths reads left to right on an Arabic page too. */}
      <figure dir="ltr" lang="en" className="min-w-0">
        <div className="relative ms-8 me-20 mt-16 mb-8 h-64 sm:h-80">
          <svg
            role="img"
            lang={language}
            aria-label={t('landing.growth.chartLabel')}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible text-muted"
          >
            <line x1="0" y1="0" x2="0" y2="100" stroke="var(--color-field)" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="var(--color-field)" vectorEffect="non-scaling-stroke" />
            {CURVES.map((c) => (
              <polyline
                key={c.label}
                points={c.points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={c.dash || undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* Where n is now. */}
            <line
              x1={x(n)}
              y1="0"
              x2={x(n)}
              y2="100"
              stroke="var(--color-accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Labels in HTML, so they stay readable at any width. */}
          <div aria-hidden="true" className="font-mono text-xs text-ink">
            {END_LABELS.map((l) => (
              <span key={l.label} className="absolute start-full ms-2 -translate-y-1/2 whitespace-nowrap" style={{ top: `${l.top}%` }}>
                {l.label}
              </span>
            ))}
            {EXIT_LABELS.map((l) => (
              <span
                key={l.label}
                className={`absolute bottom-full -translate-x-1/2 whitespace-nowrap ${ROW_GAP[l.row]}`}
                style={{ left: `${l.left}%` }}
              >
                {l.label}
              </span>
            ))}
            <span className="absolute end-full top-0 me-2 -translate-y-1/2 text-muted">{MAX}</span>
            <span className="absolute end-full bottom-0 me-2 translate-y-1/2 text-muted">{0}</span>
            {[1, 5, 10, 15, 20].map((tick) => (
              <span key={tick} className="absolute top-full mt-2 -translate-x-1/2 text-muted" style={{ left: `${x(tick)}%` }}>
                {tick}
              </span>
            ))}
            <span className="absolute start-full top-full ms-6 mt-2 text-muted">{AXIS}</span>
          </div>
        </div>
        <figcaption dir={i18n.dir(language)} lang={language} className="text-sm text-muted">
          {t('landing.growth.caption', { max: MAX })}
        </figcaption>
      </figure>

      <div className="min-w-0">
        <label htmlFor={`${id}-n`} className="flex items-center justify-between gap-4 font-medium">
          <span>
            <TextWithCode text={t('landing.growth.n')} />
          </span>
          <output htmlFor={`${id}-n`} className="font-mono text-lg text-ink tabular-nums">
            {n}
          </output>
        </label>
        {/* The track is LTR like the chart: n grows to the right. */}
        <input
          id={`${id}-n`}
          type="range"
          dir="ltr"
          min={N_MIN}
          max={N_MAX}
          value={n}
          onChange={(event) => setN(Number(event.target.value))}
          className="mt-2 h-11 w-full cursor-pointer accent-accent"
        />
        {/* Scrolls inside itself only when it can't fit (very large text on a phone). */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-start text-muted">
              <TextWithCode text={t('landing.growth.tableCaption', { n })} />
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">{t('landing.growth.class')}</th>
                <th scope="col">{t('landing.growth.operations')}</th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((c) => (
                <tr key={c.label} className="border-t border-line">
                  <th scope="row" className="py-1.5 text-start font-normal">
                    <span dir="ltr" className="inline-flex items-center gap-2 font-mono">
                      <Swatch dash={c.dash} />
                      {c.label}
                    </span>
                  </th>
                  <td className="py-1.5 text-end font-mono tabular-nums">
                    <span dir="ltr">{formatNumber(round(c.f(n)), language)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
