import type { ReactNode } from 'react'
import { parseLessonText, splitInlineCode, splitTerms } from '../lessonText'
import Content from './Content'

// The non-space characters of text that touch a code part ("(", ").", "،", "و"), or '' when
// taking them would split a ~term~.
function touching(text: string, pattern: RegExp) {
  const run = text.match(pattern)?.[0] ?? ''
  return run.split('~').length % 2 ? run : ''
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
      const lead = touching(rest, /^\S+/)
      group.push(<Terms key={index} text={lead} />)
      // Text without spaces between two code parts keeps them together.
      if (lead === rest) return
      rest = rest.slice(lead.length)
      flush()
    }
    const tail = parts[index + 1]?.code ? touching(rest, /\S+$/) : ''
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
  return (
    <Content lang={lang} as="div" className="mt-4 max-w-prose leading-relaxed">
      {parseLessonText(text).map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 key={index} className="mt-8 text-xl font-semibold">
                <TextWithCode text={block.text} />
              </h2>
            )
          case 'list':
            return (
              <ul key={index} className="mt-3 list-disc space-y-1 ps-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <TextWithCode text={item} />
                  </li>
                ))}
              </ul>
            )
          case 'code':
            return (
              // Focusable so keyboard users can scroll long lines sideways.
              <pre
                key={index}
                tabIndex={0}
                dir="ltr"
                lang="en"
                className="mt-3 overflow-x-auto rounded border border-line bg-surface p-3 font-mono text-sm leading-normal"
              >
                <code>{block.text}</code>
              </pre>
            )
          case 'paragraph':
            return (
              <p key={index} className="mt-3 whitespace-pre-wrap first:mt-0">
                <TextWithCode text={block.text} />
              </p>
            )
        }
      })}
    </Content>
  )
}
