import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { parseLessonText, splitInlineCode, splitTerms } from '../lessonText'
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
          className="rounded border border-line bg-surface px-1 font-mono text-[0.9em] whitespace-break-spaces [box-decoration-break:clone]"
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

// Renders lesson text as headings, lists, code blocks and paragraphs. Everything is a
// React text node; the text is never treated as HTML. lang is the language of the text (see
// Content); headings, paragraphs and lists follow its direction, code blocks are always LTR.
export default function LessonBody({ text, lang }: { text: string; lang: string }) {
  const { t } = useTranslation()
  return (
    <Content lang={lang} as="div" className="mt-4 max-w-prose leading-relaxed">
      {parseLessonText(text).map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 key={index} className="mt-10 text-xl font-semibold tracking-tight">
                <TextWithCode text={block.text} />
              </h2>
            )
          case 'list':
            return (
              <ul key={index} className="mt-4 list-disc space-y-1.5 ps-5 marker:text-muted">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <TextWithCode text={item} />
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
                className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface px-4 py-3 font-mono text-sm leading-normal"
              >
                <code lang="en">{block.text}</code>
              </pre>
            )
          case 'paragraph':
            return (
              <p key={index} className="mt-4 whitespace-pre-wrap first:mt-0">
                <TextWithCode text={block.text} />
              </p>
            )
        }
      })}
    </Content>
  )
}
