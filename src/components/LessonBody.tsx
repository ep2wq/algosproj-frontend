import { parseLessonText, splitInlineCode, splitTerms } from '../lessonText'
import Content from './Content'

// Text with `inline code` and ~term~ markers (code is split off first, so a ~ inside code stays).
// Code parts are isolated left to right (dir="ltr" isolates them), so expressions and values
// inside Arabic sentences keep their order. inline-block keeps a short
// expression on one line; one longer than the line wraps inside its own box. A word joiner
// (U+2060) keeps text that touches the code ("و", "،", ").") on the same line as it.
export function TextWithCode({ text }: { text: string }) {
  const parts = splitInlineCode(text)
  return parts.map((part, index) =>
    part.code ? (
      <code
        key={index}
        dir="ltr"
        lang="en"
        className="inline-block max-w-full rounded border border-line bg-surface px-1 font-mono text-[0.9em] leading-snug [overflow-wrap:anywhere]"
      >
        {part.text}
      </code>
    ) : (
      <Terms
        key={index}
        text={
          (parts[index - 1]?.code && /^\S/.test(part.text) ? '⁠' : '') +
          part.text +
          (parts[index + 1]?.code && /\S$/.test(part.text) ? '⁠' : '')
        }
      />
    ),
  )
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
