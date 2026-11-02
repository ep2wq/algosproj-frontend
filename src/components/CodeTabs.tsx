import { Check, Copy } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Language } from '../api'
import type { CodeTab } from '../lessonText'
import { LANGUAGE_LABELS } from '../starters'
import { highlight, TOKEN_CLASS } from '../syntax'
import { useScrollCue } from '../visuals/useScrollCue'
import { TextWithCode } from './LessonBody'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

// A lesson's run of "## Python", "## Java"... sections as one code block with a tab per language
// (lessonText.ts lessonItems decides when). Python opens first: the problem editor does not keep the
// last language anywhere. The code has static syntax colours (src/syntax.ts), or none if the pieces
// would not give back the exact text. A heading's extra words and a short paragraph after the code
// show as small notes under it. Copy copies the exact code and says so in a status line.
export default function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const { t } = useTranslation()
  const [value, setValue] = useState<Language>(tabs.some((tab) => tab.language === 'python') ? 'python' : tabs[0].language)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const [tabRow, moreTabs] = useScrollCue<HTMLDivElement>()

  function copy() {
    const tab = tabs.find((item) => item.language === value)
    if (!tab) return
    navigator.clipboard
      .writeText(tab.code)
      .then(() => {
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <Tabs value={value} onValueChange={(next) => setValue(next as Language)} className="mt-6 overflow-hidden rounded-lg border border-line bg-code">
      <div className="flex items-stretch border-b border-line bg-surface">
        <TabsList ref={tabRow} aria-label={t('lesson.codeTabs')} className={`min-w-0 flex-1 border-b-0 px-1 ${moreTabs ? 'scroll-fade' : ''}`}>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.language} value={tab.language} lang="en" dir="ltr">
              {LANGUAGE_LABELS[tab.language]}
            </TabsTrigger>
          ))}
        </TabsList>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 px-3 text-sm text-muted hover:bg-hover hover:text-ink focus-visible:outline-offset-[-2px]!"
        >
          {copied ? <Check aria-hidden="true" className="size-4 text-pass" /> : <Copy aria-hidden="true" className="size-4" />}
          <span className="max-sm:sr-only">{t('lesson.copy')}</span>
        </button>
      </div>
      {tabs.map((tab) => {
        const tokens = highlight(tab.code, tab.language)
        return (
          <TabsContent key={tab.language} value={tab.language}>
            {/* Focusable so keyboard users can scroll long lines sideways, and a named region. */}
            <pre
              tabIndex={0}
              dir="ltr"
              role="region"
              aria-label={t('lesson.codeIn', { language: LANGUAGE_LABELS[tab.language] })}
              className="overflow-x-auto px-5 py-4 font-mono text-[0.9375rem] leading-relaxed"
            >
              <code lang="en">
                {tokens
                  ? tokens.map(([type, text], index) =>
                      type === 'plain' ? (
                        text
                      ) : (
                        <span key={index} className={TOKEN_CLASS[type]}>
                          {text}
                        </span>
                      ),
                    )
                  : tab.code}
              </code>
            </pre>
            {(tab.note || tab.after) && (
              <div className="space-y-1 border-t border-line bg-surface px-5 py-2.5 text-sm text-muted">
                {tab.note && (
                  <p>
                    <TextWithCode text={tab.note} />
                  </p>
                )}
                {tab.after && (
                  <p>
                    <TextWithCode text={tab.after} />
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        )
      })}
      <p role="status" className="sr-only">
        {copied ? t('lesson.copied') : ''}
      </p>
    </Tabs>
  )
}
