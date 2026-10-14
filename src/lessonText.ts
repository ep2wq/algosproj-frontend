// Parses lesson text (lessons.body) into blocks. A small subset of markdown:
// "## " heading, "- " list items, lines indented with 4 spaces are code, everything else
// is paragraphs separated by blank lines (single line breaks inside a paragraph are kept).

export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'paragraph'; text: string }

const isBlank = (line: string) => line.trim() === ''
const isHeading = (line: string) => line.startsWith('## ')
const isListItem = (line: string) => line.startsWith('- ')
const isCode = (line: string) => line.startsWith('    ')

export function parseLessonText(text: string): LessonBlock[] {
  const lines = text.split(/\r?\n/)
  const blocks: LessonBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (isBlank(line)) {
      i++
    } else if (isHeading(line)) {
      blocks.push({ type: 'heading', text: line.slice(3) })
      i++
    } else if (isCode(line)) {
      const code: string[] = []
      while (i < lines.length) {
        if (isCode(lines[i])) {
          code.push(lines[i].slice(4))
          i++
          continue
        }
        // Blank lines stay in the code block only if more code follows them.
        let next = i
        while (next < lines.length && isBlank(lines[next])) next++
        if (next === i || next === lines.length || !isCode(lines[next])) break
        for (; i < next; i++) code.push('')
      }
      blocks.push({ type: 'code', text: code.join('\n') })
    } else if (isListItem(line)) {
      const items: string[] = []
      while (i < lines.length && isListItem(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: 'list', items })
    } else {
      const paragraph: string[] = []
      while (
        i < lines.length &&
        !isBlank(lines[i]) &&
        !isHeading(lines[i]) &&
        !isCode(lines[i]) &&
        !isListItem(lines[i])
      ) {
        paragraph.push(lines[i])
        i++
      }
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
    }
  }

  return blocks
}
