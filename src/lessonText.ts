import type { Language } from './api'

// Parses lesson text (lessons.body, body_ar) into blocks. A small subset of markdown:
// "## " heading, "- " list items, lines indented with 4 spaces are code, lines starting "> " an
// example callout and ">! " a key idea box (consecutive lines of one kind form one box), everything
// else is paragraphs separated by blank lines (single line breaks inside a paragraph are kept).

export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; kind: 'example' | 'key'; text: string }

const isBlank = (line: string) => line.trim() === ''
const isHeading = (line: string) => line.startsWith('## ')
const isListItem = (line: string) => line.startsWith('- ')
const isCode = (line: string) => line.startsWith('    ')
const calloutKind = (line: string) => (line.startsWith('>! ') ? 'key' : line.startsWith('> ') ? 'example' : null)

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
    } else if (calloutKind(line)) {
      const kind = calloutKind(line)!
      const callout: string[] = []
      while (i < lines.length && calloutKind(lines[i]) === kind) {
        callout.push(lines[i].slice(kind === 'key' ? 3 : 2))
        i++
      }
      blocks.push({ type: 'callout', kind, text: callout.join('\n') })
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
        !isListItem(lines[i]) &&
        !calloutKind(lines[i])
      ) {
        paragraph.push(lines[i])
        i++
      }
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
    }
  }

  return blocks
}

// A lesson laid out for its page: each "## " heading becomes a numbered section with an id
// (section-1, section-2...: the same in both languages, which share the structure), and a run of
// sections headed by a programming language whose body is only a code block (plus at most one short
// paragraph) becomes one tabbed code block. Anything that doesn't match exactly stays as it is.
export type LessonSection = { id: string; number: number; text: string }
export type CodeTab = { language: Language; code: string; note: string; after: string }
export type LessonItem =
  | Exclude<LessonBlock, { type: 'heading' }>
  | ({ type: 'section' } & LessonSection)
  | { type: 'codeTabs'; tabs: CodeTab[] }

// "## Python", "## ~Java~ (the class must be named Main)": the language, then an optional note.
const LANGUAGE_HEADING = /^~?(JavaScript|Java|Python|C\+\+)~?(?:\s+(.+))?$/
const LANGUAGE_IDS: Record<string, Language> = { Python: 'python', Java: 'java', JavaScript: 'javascript', 'C++': 'cpp' }
const SHORT_PARAGRAPH = 200

function languageHeading(block: LessonBlock | undefined) {
  if (block?.type !== 'heading') return null
  const match = block.text.match(LANGUAGE_HEADING)
  if (!match) return null
  // A note in brackets loses them: it is shown as a small line of its own.
  const note = (match[2] ?? '').replace(/^\((.*)\)$/, '$1')
  return { language: LANGUAGE_IDS[match[1]], note }
}

// tabs false (every page but the lesson page, and the admin preview) keeps language sections as they are.
export function lessonItems(text: string, tabs = true): LessonItem[] {
  const blocks = parseLessonText(text)
  const items: LessonItem[] = []
  let number = 0
  let i = 0
  // After a cancelled run, no new run starts before the next heading that is not a language.
  let noRunUntil = 0
  while (i < blocks.length) {
    const block = blocks[i]
    // Try a run of language sections from here: each is a language heading, one code block, at most
    // one short one-line paragraph, then the next heading or the end. A language section that does
    // not fit (or repeats a language) cancels the whole run, so it renders exactly as before.
    const run: CodeTab[] = []
    let j = i
    let exact = tabs && i >= noRunUntil
    for (let heading = exact ? languageHeading(blocks[j]) : null; heading; heading = languageHeading(blocks[j])) {
      const code = blocks[j + 1]
      const after = blocks[j + 2]
      const short = after?.type === 'paragraph' && after.text.length <= SHORT_PARAGRAPH && !after.text.includes('\n')
      const end = j + (short ? 3 : 2)
      if (code?.type !== 'code' || run.some((tab) => tab.language === heading.language) || (end < blocks.length && blocks[end].type !== 'heading')) {
        exact = false
        break
      }
      run.push({ language: heading.language, code: code.text, note: heading.note, after: short && after.type === 'paragraph' ? after.text : '' })
      j = end
    }
    if (exact && run.length >= 2) {
      items.push({ type: 'codeTabs', tabs: run })
      i = j
      continue
    }
    if (tabs && !exact && i >= noRunUntil) {
      noRunUntil = i + 1
      while (noRunUntil < blocks.length && (blocks[noRunUntil].type !== 'heading' || languageHeading(blocks[noRunUntil]))) noRunUntil++
    }
    if (block.type === 'heading') {
      number++
      items.push({ type: 'section', id: `section-${number}`, number, text: block.text })
    } else {
      items.push(block)
    }
    i++
  }
  return items
}

// The numbered sections of a lesson, for its "On this page" list.
export function lessonSections(text: string): LessonSection[] {
  return lessonItems(text).filter((item): item is { type: 'section' } & LessonSection => item.type === 'section')
}

// Splits lesson or problem text on `inline code`. Code parts are shown left to right inside
// Arabic text, so expressions and values keep their order. A lone backtick stays as text.
export function splitInlineCode(text: string): { code: boolean; text: string }[] {
  return text.split(/(`[^`\n]+`)/).filter(Boolean).map((part) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? { code: true, text: part.slice(1, -1) } : { code: false, text: part },
  )
}

// Splits prose (never code) on ~term~ markers: an English term inside Arabic text, shown as plain
// text isolated left to right. A marker starts and ends with a non-space character, so a lone or
// empty ~ (or "~ ~") stays as text.
export function splitTerms(text: string): { term: boolean; text: string }[] {
  return text
    .split(/(~[^~\s](?:[^~\n]*[^~\s])?~)/)
    .map((part, index) => (index % 2 === 1 ? { term: true, text: part.slice(1, -1) } : { term: false, text: part }))
    .filter((part) => part.text)
}
