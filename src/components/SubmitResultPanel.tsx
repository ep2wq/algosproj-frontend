import { useEffect, useState, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { SubmitResult, SubmitStatus, TestResult, VisibleTestResult } from '../api'
import { formatNumber } from '../i18n'
import { DUR, reducedMotion } from '../motion'
import { AlertIcon, CheckIcon, CrossIcon } from './Icons'
import { TextWithCode } from './LessonBody'

const STATUS_STYLES: Record<SubmitStatus, string> = {
  passed: 'bg-pass/10 text-pass border-pass/30',
  failed: 'bg-fail/10 text-fail border-fail/30',
  error: 'bg-warn/10 text-warn border-warn/30',
  timeout: 'bg-warn/10 text-warn border-warn/30',
}

function isVisible(result: TestResult): result is VisibleTestResult {
  return 'input' in result
}

// Program text is always left to right; "(empty)" is interface text, so it keeps the page language.
function Output({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd>
        {value === null || value === '' ? (
          <p className="mt-0.5 w-fit max-w-full rounded bg-code px-2 py-1 text-sm text-muted">{t('result.empty')}</p>
        ) : (
          <pre dir="ltr" lang="en" className="mt-0.5 w-fit max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded bg-code px-2 py-1 font-mono text-sm">
            {value}
          </pre>
        )}
      </dd>
    </div>
  )
}

// The icon repeats the status word, so it is hidden from screen readers. A pass draws its check once
// (attempt remounts it for each new result; motion-safe only).
function StatusIcon({ status }: { status: SubmitStatus }) {
  if (status === 'passed') return <CheckIcon className="size-4 motion-safe:animate-check [stroke-dasharray:24]" />
  if (status === 'failed') return <CrossIcon />
  return <AlertIcon />
}

// "+N points" counts up once to the number the server awarded (never computed here), ease-out over
// --dur-max; the last frame is the exact number. Under reduced motion it shows that number at once.
// Screen readers get only the final text. attempt remounts it for each new result.
function PointsAwarded({ points }: { points: number }) {
  const { t, i18n } = useTranslation()
  const [shown, setShown] = useState(() => (reducedMotion() ? points : Math.min(points, 1)))
  useEffect(() => {
    if (reducedMotion() || points <= 1) return
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(Math.max(now - start, 0) / DUR.max, 1)
      setShown(Math.max(1, Math.round(points * (1 - (1 - progress) ** 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [points])
  const text = (count: number) => t('result.pointsAwarded', { count, value: formatNumber(count, i18n.language) })
  return (
    <span className="text-sm font-semibold text-pass tabular-nums">
      <span aria-hidden="true">{text(shown)}</span>
      <span className="sr-only">{text(points)}</span>
    </span>
  )
}

// heading is one level below the page's Examples heading (h3 on the challenge page, h4 in a lesson).
// summaryRef: ProblemSolver moves focus to the summary for each new result, which is how it is
// announced (so it is not a live region too: that would read it twice). busy: the next submit is
// running, so this result is the old one.
export default function SubmitResultPanel({
  result,
  attempt,
  heading: Heading,
  summaryRef,
  busy,
}: {
  result: SubmitResult
  attempt: number
  heading: 'h3' | 'h4'
  summaryRef: Ref<HTMLDivElement>
  busy: boolean
}) {
  const { t, i18n } = useTranslation()
  const outcome = (passed: boolean) => (
    <span className={passed ? 'text-pass' : 'text-fail'}>{passed ? t('result.passed') : t('result.failed')}</span>
  )
  // Visible tests one by one, then the hidden ones as one line.
  const visible = result.results.filter(isVisible)
  const hidden = result.results.filter((test) => !isVisible(test))
  const hiddenPassed = hidden.filter((test) => test.passed).length
  const hiddenOk = hiddenPassed === hidden.length

  return (
    <section
      aria-label={t('result.label')}
      aria-busy={busy}
      className={`mt-4 min-h-16 rounded-lg border border-line bg-surface p-4 motion-safe:animate-appear motion-safe:transition-opacity motion-safe:duration-(--dur-ui) ${busy ? 'opacity-60' : ''}`}
    >
      {/* Only the summary is announced (by focus); the tests below are there to read. No test ran
          after a compile error, so it has no count or runtime. The runtime is LTR, so Arabic shows
          "47 ms". The badge lands once: a pass pops in, anything else shakes (two cycles of 4 px). */}
      <div ref={summaryRef} tabIndex={-1} role="group" aria-label={t('result.summary')} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded">
        <span
          key={attempt}
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-sm font-semibold ${STATUS_STYLES[result.status]} ${
            result.status === 'passed' ? 'motion-safe:animate-pop' : 'motion-safe:animate-shake'
          }`}
        >
          <StatusIcon status={result.status} />
          {t(`result.status.${result.status}`)}
        </span>
        {!result.compile_error && (
          <span className="text-sm text-ink tabular-nums">
            {t('result.testsPassed', { passed: result.passed_count, count: result.total_count })}
          </span>
        )}
        {!result.compile_error && result.runtime_ms !== null && (
          <span dir="ltr" className="text-sm text-muted tabular-nums">{t('result.milliseconds', { ms: result.runtime_ms })}</span>
        )}
        {result.points_awarded > 0 && <PointsAwarded key={`points-${attempt}`}points={result.points_awarded} />}
        {result.status === 'passed' && result.points_awarded === 0 && (
          <span className="text-sm text-muted">{t('result.alreadySolved')}</span>
        )}
      </div>

      {result.compile_error && (
        <div className="mt-4">
          <Heading className="flex items-center gap-1.5 text-sm font-medium text-warn">
            <AlertIcon />
            <span>
              <TextWithCode text={t('result.compileError')} />
            </span>
          </Heading>
          {/* Not wrapped, so the ^ markers stay under the code they point at; focusable to scroll. */}
          <pre tabIndex={0} dir="ltr" lang="en" className="mt-1 overflow-x-auto whitespace-pre rounded bg-code p-3 font-mono text-sm text-ink">
            {result.compile_error}
          </pre>
        </div>
      )}

      {result.results.length > 0 && (
        <ol className="mt-4 space-y-2">
          {visible.map((test, index) => (
            <li key={index} className={`flex gap-2.5 rounded-lg border px-3 py-2 ${test.passed ? 'border-line' : 'border-fail/30 bg-fail/5'}`}>
              <span className={`mt-0.5 shrink-0 ${test.passed ? 'text-pass' : 'text-fail'}`}>
                {test.passed ? <CheckIcon /> : <CrossIcon />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t('result.test', { number: index + 1 })} {outcome(test.passed)}
                </p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Output label={t('result.input')} value={test.input} />
                  <Output label={t('result.expected')} value={test.expected} />
                  <Output label={t('result.actual')} value={test.actual} />
                </dl>
                {test.error && (
                  <pre tabIndex={0} dir="ltr" lang="en" className="mt-2 overflow-x-auto whitespace-pre rounded bg-fail/5 p-2 font-mono text-sm text-fail">
                    {test.error}
                  </pre>
                )}
              </div>
            </li>
          ))}
          {hidden.length > 0 && (
            <li className={`flex gap-2.5 rounded-lg border px-3 py-2 ${hiddenOk ? 'border-line' : 'border-fail/30 bg-fail/5'}`}>
              <span className={`mt-0.5 shrink-0 ${hiddenOk ? 'text-pass' : 'text-fail'}`}>{hiddenOk ? <CheckIcon /> : <CrossIcon />}</span>
              <p className="min-w-0 flex-1 text-sm tabular-nums">
                {t('result.hiddenTests', {
                  count: hidden.length,
                  value: formatNumber(hidden.length, i18n.language),
                  passed: formatNumber(hiddenPassed, i18n.language),
                })}
              </p>
            </li>
          )}
        </ol>
      )}
    </section>
  )
}
