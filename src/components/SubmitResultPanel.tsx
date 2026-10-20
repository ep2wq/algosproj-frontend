import { useTranslation } from 'react-i18next'
import type { SubmitResult, SubmitStatus, TestResult, VisibleTestResult } from '../api'
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
          <p className="mt-0.5 w-fit max-w-full rounded bg-paper px-2 py-1 text-sm text-muted">{t('result.empty')}</p>
        ) : (
          <pre dir="ltr" lang="en" className="mt-0.5 w-fit max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded bg-paper px-2 py-1 font-mono text-sm">
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

// heading is one level below the page's Examples heading (h3 on the challenge page, h4 in a lesson).
export default function SubmitResultPanel({
  result,
  attempt,
  heading: Heading,
}: {
  result: SubmitResult
  attempt: number
  heading: 'h3' | 'h4'
}) {
  const { t } = useTranslation()
  const outcome = (passed: boolean) => (
    <span className={passed ? 'text-pass' : 'text-fail'}>{passed ? t('result.passed') : t('result.failed')}</span>
  )

  return (
    <section aria-label={t('result.label')} className="mt-4 rounded-lg border border-line bg-surface p-4 motion-safe:animate-appear">
      {/* Only the summary is announced; the tests below are there to read. No test ran after a
          compile error, so it has no count or runtime. The runtime is LTR, so Arabic shows "47 ms". */}
      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          key={attempt}
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-sm font-semibold ${STATUS_STYLES[result.status]} ${
            result.status === 'passed' ? 'motion-safe:animate-bump' : ''
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
        {result.points_awarded > 0 && (
          <span className="text-sm font-semibold text-pass">{t('result.pointsAwarded', { count: result.points_awarded })}</span>
        )}
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
          <pre tabIndex={0} dir="ltr" lang="en" className="mt-1 overflow-x-auto whitespace-pre rounded bg-paper p-3 font-mono text-sm text-ink">
            {result.compile_error}
          </pre>
        </div>
      )}

      {result.results.length > 0 && (
        <ol className="mt-4 space-y-2">
          {result.results.map((test, index) => (
            <li key={index} className={`flex gap-2.5 rounded-lg border px-3 py-2 ${test.passed ? 'border-line' : 'border-fail/30 bg-fail/5'}`}>
              <span className={`mt-0.5 shrink-0 ${test.passed ? 'text-pass' : 'text-fail'}`}>
                {test.passed ? <CheckIcon /> : <CrossIcon />}
              </span>
              <div className="min-w-0 flex-1">
                {isVisible(test) ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-sm">
                    {t('result.hiddenTest')} {outcome(test.passed)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
