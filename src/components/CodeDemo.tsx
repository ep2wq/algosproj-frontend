import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../api'
import { BINARY_SEARCH_SAMPLES, SAMPLE_RUN } from '../codeSamples'
import { LANGUAGE_LABELS } from '../starters'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

// The landing page's code and console: the binary search problem in the four languages and a fixed
// run in the words of the real result panel. Static: nothing is run or sent from here. Code panes
// scroll sideways inside themselves (tabIndex 0, so the keyboard can scroll them too).
export default function CodeDemo() {
  const { t } = useTranslation()
  const total = SAMPLE_RUN.visible.length + SAMPLE_RUN.hidden
  const passed = <span className="text-pass">{t('result.passed')}</span>

  return (
    <div className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Tabs defaultValue="python" className="min-w-0">
        <TabsList aria-label={t('landing.demo.tabsLabel')} className="px-2">
          {LANGUAGES.map((id) => (
            <TabsTrigger key={id} value={id} lang="en" dir="ltr">
              {LANGUAGE_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
        {LANGUAGES.map((id) => (
          <TabsContent key={id} value={id} className="flex flex-col">
            {/* As tall as the longest sample, so switching languages moves nothing; down to the foot of
                the console beside it. */}
            <pre
              dir="ltr"
              lang="en"
              tabIndex={0}
              aria-label={t('landing.demo.codeLabel', { language: LANGUAGE_LABELS[id] })}
              className="min-h-[29.5rem] flex-1 overflow-x-auto bg-paper p-4 font-mono text-sm leading-5"
            >
              <code>{BINARY_SEARCH_SAMPLES[id]}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>

      <section aria-labelledby="landing-demo-run" className="border-t border-line p-4 lg:border-t-0 lg:border-s">
        <h3 id="landing-demo-run" className="flex min-h-11 items-center text-sm font-semibold">
          {t('landing.demo.runTitle')}
        </h3>
        <ol className="mt-2 space-y-3 text-sm">
          {SAMPLE_RUN.visible.map((test, index) => (
            <li key={test.input}>
              <p>
                {t('result.test', { number: index + 1 })} {passed}
              </p>
              <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-muted">
                <dt>{t('result.input')}</dt>
                <dd className="font-mono text-ink">
                  <span dir="ltr" className="inline-block whitespace-pre">{test.input}</span>
                </dd>
                <dt>{t('result.expected')}</dt>
                <dd className="font-mono text-ink">
                  <span dir="ltr" className="inline-block">{test.expected}</span>
                </dd>
                <dt>{t('result.actual')}</dt>
                <dd className="font-mono text-ink">
                  <span dir="ltr" className="inline-block">{test.actual}</span>
                </dd>
              </dl>
            </li>
          ))}
          {Array.from({ length: SAMPLE_RUN.hidden }, (_, index) => (
            <li key={index}>
              {t('result.hiddenTest')} {passed}
            </li>
          ))}
        </ol>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-sm">
          <span className="rounded border border-pass/30 bg-pass/10 px-2 py-0.5 font-semibold text-pass">
            {t('result.status.passed')}
          </span>
          <span>{t('result.testsPassed', { passed: total, count: total })}</span>
          <span dir="ltr" className="font-mono text-muted">
            {t('result.milliseconds', { ms: SAMPLE_RUN.ms })}
          </span>
        </p>
        <p className="mt-4 text-xs text-muted">{t('landing.demo.note')}</p>
      </section>
    </div>
  )
}
