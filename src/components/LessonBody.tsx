import { Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { lessonItems, splitInlineCode, splitTerms } from '../lessonText'
import CodeTabs from './CodeTabs'
import Content from './Content'

// The non-space characters at the start or end of text that touch a code part ("(", ").", "،",
// "و"), or '' when cutting them off would cut through a ~term~ marker.
function touching(text: string, side: 'start' | 'end') {
  const run = text.match(side === 'start' ? /^\S+/ : /\S+$/)?.[0] ?? ''
  const cut = side === 'start' ? run.length : text.length - run.length
  let offset = 0
  for (const part of splitTerms(text)) {
    const end = offset + part.text.length + (part.term ? 2 : 0)
    if (part.term && offset < cut && cut < end) return ''
    offset = end
  }
  return run
}

// Text with `inline code` and ~term~ markers (code is split off first, so a ~ inside code stays).
// Code parts are isolated left to right (dir="ltr" isolates them), so expressions and values
// inside Arabic sentences keep their order. Each code part and the text touching it ("(", ").",
// "،", "و") share one inline-block span: a line never breaks at its edges (Chrome ignores a word
// joiner next to an inline-block), so a short expression stays on one line with its punctuation,
// and a group longer than the line wraps inside its own box instead of overflowing.
export function TextWithCode({ text }: { text: string }) {
  const parts = splitInlineCode(text)
  const nodes: ReactNode[] = []
  let group: ReactNode[] = []
  const flush = () => {
    if (group.length > 0) {
      nodes.push(
        <span key={`g${nodes.length}`} className="inline-block max-w-full leading-snug [overflow-wrap:anywhere]">
          {group}
        </span>,
      )
    }
    group = []
  }

  parts.forEach((part, index) => {
    if (part.code) {
      group.push(
        <code
          key={index}
          dir="ltr"
          lang="en"
          className="rounded border border-line bg-code px-1 font-mono text-[0.88em] whitespace-break-spaces [box-decoration-break:clone]"
        >
          {part.text}
        </code>,
      )
      return
    }
    let rest = part.text
    if (group.length > 0) {
      const lead = touching(rest, 'start')
      group.push(<Terms key={index} text={lead} />)
      // Text without spaces between two code parts keeps them together.
      if (lead === rest) return
      rest = rest.slice(lead.length)
      flush()
    }
    const tail = parts[index + 1]?.code ? touching(rest, 'end') : ''
    nodes.push(<Terms key={`t${index}`} text={rest.slice(0, rest.length - tail.length)} />)
    if (tail) group.push(<Terms key={index} text={tail} />)
  })
  flush()
  return nodes
}

// Prose with ~term~ markers (Arabic text keeps technical terms in English). Each term is plain
// text, isolated left to right and marked English, so it keeps its order and screen readers read
// it in English. English text never uses markers, so it renders as before.
function Terms({ text }: { text: string }) {
  return splitTerms(text).map((part, index) =>
    part.term ? (
      <bdi key={index} dir="ltr" lang="en">
        {part.text}
      </bdi>
    ) : (
      part.text
    ),
  )
}

// Renders lesson text as headings, lists, code blocks, callouts and paragraphs, in the reading type
// scale (text-lesson-* in index.css). Everything is a React text node; the text is never treated as
// HTML. lang is the language of the text (see Content); headings, paragraphs and lists follow its
// direction, code blocks are always LTR. ~term~ and emphasised terms are ink and semibold.
// lesson (the lesson page only): headings get a quiet two-digit number and an id (section-1...,
// lessonText.ts lessonItems), the first paragraph is a lead, a run of language sections becomes one
// tabbed code block, and the column width is left to the page.
export default function LessonBody({ text, lang, lesson = false }: { text: string; lang: string; lesson?: boolean }) {
  const { t } = useTranslation()
  const items = lessonItems(text, lesson)
  const firstParagraph = items.findIndex((item) => item.type === 'paragraph')
  return (
    <Content
      lang={lang}
      as="div"
      className={`text-lesson-body text-ink [&_bdi]:font-semibold [&_bdi]:text-ink ${lesson ? '' : 'mt-4 max-w-prose'}`}
    >
      {items.map((item, index) => {
        switch (item.type) {
          case 'section':
            return (
              <h2 key={index} id={lesson ? item.id : undefined} className="text-lesson-heading mt-8 mb-3 first:mt-0">
                {/* Western digits in both languages; the heading's name is the words alone. */}
                {lesson && (
                  <span aria-hidden="true" className="me-3 font-mono text-[0.8em] font-medium text-muted">
                    {String(item.number).padStart(2, '0')}
                  </span>
                )}
                <TextWithCode text={item.text} />
              </h2>
            )
          case 'codeTabs':
            return <CodeTabs key={index} tabs={item.tabs} />
          case 'list':
            return (
              <ul key={index} className="mt-4 space-y-2">
                {item.items.map((entry, itemIndex) => (
                  // A short muted dash as the marker, at the middle of the first line.
                  <li key={itemIndex} className="relative ps-6 before:absolute before:start-1.5 before:top-[calc(0.5lh-1px)] before:h-0.5 before:w-2.5 before:rounded-sm before:bg-muted">
                    <TextWithCode text={entry} />
                  </li>
                ))}
              </ul>
            )
          case 'code':
            return (
              // Focusable so keyboard users can scroll long lines sideways, and a named region (a
              // plain pre can't carry a name) like the scrolling visualizations. The name is in the
              // page's language, so lang="en" is on the code only.
              <pre
                key={index}
                tabIndex={0}
                dir="ltr"
                role="region"
                aria-label={t('common.codeSnippet')}
                className="mt-5 overflow-x-auto rounded-lg border border-line bg-code px-5 py-4 font-mono text-[0.9375rem] leading-relaxed"
              >
                <code lang="en">{item.text}</code>
              </pre>
            )
          case 'callout':
            return item.kind === 'example' ? (
              // An example: a warn-coloured edge at the start, rounded on the end side only.
              <div key={index} className="mt-5 rounded-e-lg border-s-4 border-warn bg-surface px-4 py-3">
                <p className="text-sm font-semibold text-warn">{t('lesson.example')}</p>
                <p className="mt-1 whitespace-pre-wrap">
                  <TextWithCode text={item.text} />
                </p>
              </div>
            ) : (
              <div key={index} className="mt-5 flex gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <Lightbulb aria-hidden="true" className="mt-1 size-5 shrink-0 text-warn" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t('lesson.keyIdea')}</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    <TextWithCode text={item.text} />
                  </p>
                </div>
              </div>
            )
          case 'paragraph':
            return (
              <p key={index} className={`mt-4 whitespace-pre-wrap first:mt-0 ${lesson && index === firstParagraph ? 'text-lesson-lead' : ''}`}>
                <TextWithCode text={item.text} />
              </p>
            )
        }
      })}
    </Content>
  )
}
