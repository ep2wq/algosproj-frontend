import { useTranslation } from 'react-i18next'
import type { SubmitResult, SubmitStatus, TestResult, VisibleTestResult } from '../api'
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

export default function SubmitResultPanel({ result }: { result: SubmitResult }) {
  const { t } = useTranslation()
  const outcome = (passed: boolean) => (
    <span className={passed ? 'text-pass' : 'text-fail'}>{passed ? t('result.passed') : t('result.failed')}</span>
  )

  return (
    <section aria-label={t('result.label')} aria-live="polite" className="mt-4 rounded border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={`rounded border px-2 py-0.5 text-sm font-semibold ${STATUS_STYLES[result.status]}`}>
          {t(`result.status.${result.status}`)}
        </span>
        <span className="text-sm text-ink tabular-nums">
          {t('result.testsPassed', { passed: result.passed_count, count: result.total_count })}
        </span>
        {result.runtime_ms !== null && (
          <span className="text-sm text-muted tabular-nums">{t('result.milliseconds', { ms: result.runtime_ms })}</span>
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
          <h4 className="text-sm font-medium text-fail">
            <TextWithCode text={t('result.compileError')} />
          </h4>
          <pre dir="ltr" lang="en" className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-paper p-3 font-mono text-sm text-ink">
            {result.compile_error}
          </pre>
        </div>
      )}

      {result.results.length > 0 && (
        <ol className="mt-4 space-y-2">
          {result.results.map((test, index) => (
            <li
              key={index}
              className={`rounded border border-line border-s-4 px-3 py-2 ${test.passed ? 'border-s-pass' : 'border-s-fail'}`}
            >
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
                    <pre dir="ltr" lang="en" className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-fail/5 p-2 font-mono text-sm text-fail">
                      {test.error}
                    </pre>
                  )}
                </>
              ) : (
                <p className="text-sm">
                  {t('result.hiddenTest')} {outcome(test.passed)}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
