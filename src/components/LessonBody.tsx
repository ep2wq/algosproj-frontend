import { parseLessonText } from '../lessonText'

// Renders lesson text as headings, lists, code blocks and paragraphs. Everything is a
// React text node; the text is never treated as HTML.
export default function LessonBody({ text }: { text: string }) {
  return (
    <div className="mt-4 max-w-prose leading-relaxed">
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
              <ul key={index} className="mt-3 list-disc space-y-1 pl-5">
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
                className="mt-3 overflow-x-auto rounded border border-line bg-white p-3 font-mono text-sm leading-normal"
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
    </div>
  )
}
