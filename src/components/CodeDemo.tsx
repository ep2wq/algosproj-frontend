import { SquareTerminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../api'
import { BINARY_SEARCH_LINES, SAMPLE_RUN } from '../codeSamples'
import { formatNumber } from '../i18n'
import { LANGUAGE_LABELS } from '../starters'
import { TOKEN_CLASS } from '../syntax'
import { useScrollCue } from '../visuals/useScrollCue'
import { CheckIcon } from './Icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

// The landing page's code and console: the binary search loop in the four languages, with static
// syntax colours (pre-split in codeSamples.ts, no highlighter), and a fixed run in the words of the
// real result panel. Static: nothing is run or sent from here. Code panes scroll sideways inside
// themselves (tabIndex 0, so the keyboard can scroll them too).
export default function CodeDemo() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  // On a narrow phone the four labels scroll and the row's end edge fades.
  const [tabRow, moreTabs] = useScrollCue<HTMLDivElement>()
  const total = SAMPLE_RUN.visible.length + SAMPLE_RUN.hidden
  const passed = (
    <span className="ms-auto inline-flex shrink-0 items-center gap-1.5 text-pass">
      <CheckIcon />
      {t('result.passed')}
    </span>
  )

  return (
    <div className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Tabs defaultValue="python" className="min-w-0">
        <TabsList ref={tabRow} aria-label={t('landing.demo.tabsLabel')} className={`px-2 ${moreTabs ? 'scroll-fade' : ''}`}>
          {LANGUAGES.map((id) => (
            <TabsTrigger key={id} value={id} lang="en" dir="ltr">
              {LANGUAGE_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
        {LANGUAGES.map((id) => (
          // As tall as the longest sample (11 lines), so switching languages moves nothing; down to the
          // foot of the console beside it. The line numbers are a column of their own, outside the
          // code, so they are never selected or copied, and hidden from screen readers. Both columns
          // set leading-5 themselves: the Arabic page's [lang='en'] rule would give the code its own.
          <TabsContent key={id} value={id} dir="ltr" className="flex min-h-[15.75rem] bg-code font-mono text-sm">
            <div aria-hidden="true" className="shrink-0 py-4 ps-4 pe-3 text-end leading-5 text-muted tabular-nums select-none">
              {BINARY_SEARCH_LINES[id].map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <pre
              lang="en"
              tabIndex={0}
              aria-label={t('landing.demo.codeLabel', { language: LANGUAGE_LABELS[id] })}
              className="min-w-0 flex-1 overflow-x-auto py-4 pe-4 leading-5"
            >
              <code>
                {BINARY_SEARCH_LINES[id].map((line, index) => (
                  <span key={index}>
                    {line.map(([type, text], piece) => (
                      <span key={piece} className={TOKEN_CLASS[type]}>
                        {text}
                      </span>
                    ))}
                    {'\n'}
                  </span>
                ))}
              </code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>

      <section aria-labelledby="landing-demo-run" className="border-t border-line p-4 lg:border-t-0 lg:border-s">
        <h3 id="landing-demo-run" className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <SquareTerminal aria-hidden="true" className="size-4.5 text-muted" strokeWidth={2} />
          {t('landing.demo.runTitle')}
        </h3>
        <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
          {SAMPLE_RUN.visible.map((test, index) => (
            <li key={test.input} className="flex items-center gap-3 py-2.5">
              {t('landing.demo.test', { number: index + 1 })}
              {passed}
            </li>
          ))}
          <li className="flex items-center gap-3 py-2.5">
            {t('landing.demo.hiddenTests', { count: SAMPLE_RUN.hidden, value: formatNumber(SAMPLE_RUN.hidden, language) })}
            {passed}
          </li>
        </ul>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="rounded border border-pass/30 bg-pass/10 px-2 py-0.5 font-semibold text-pass">
            {t('result.status.passed')}
          </span>
          <span>{t('landing.demo.testsCount', { count: total, passed: formatNumber(total, language), value: formatNumber(total, language) })}</span>
          <span dir="ltr" className="font-mono text-muted">
            {t('result.milliseconds', { ms: SAMPLE_RUN.ms })}
          </span>
        </p>
        <p className="mt-4 text-xs text-muted">{t('landing.demo.note')}</p>
      </section>
    </div>
  )
}
