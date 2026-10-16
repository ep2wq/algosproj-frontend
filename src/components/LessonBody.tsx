import { parseLessonText } from '../lessonText'
import Content from './Content'

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
                {block.text}
              </h2>
            )
          case 'list':
            return (
              <ul key={index} className="mt-3 list-disc space-y-1 ps-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
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
                {block.text}
              </p>
            )
        }
      })}
    </Content>
  )
}
