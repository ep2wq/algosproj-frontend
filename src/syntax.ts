import type { Language } from './api'

// Static syntax colours for code whose language is known (the lesson's language tabs; the landing
// sample is stored already split, in codeSamples.ts). A small hand-written scanner per language: it
// only cuts the text into typed pieces, rendered as spans with a .syntax-<type> class (index.css).
// No evaluation and no HTML. Joined back, the pieces must equal the input exactly; if they do not,
// highlight() returns null and the code is shown as plain text.

export type TokenType = 'keyword' | 'function' | 'number' | 'string' | 'comment' | 'operator' | 'plain'
export type Token = [TokenType, string]

const KEYWORDS: Record<Language, Set<string>> = {
  python: new Set(
    'and as assert break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield'.split(' '),
  ),
  java: new Set(
    'abstract boolean break byte case catch char class continue default do double else enum extends false final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true try var void while'.split(' '),
  ),
  javascript: new Set(
    'async await break case catch class const continue default do else export extends false finally for function if import in instanceof let new null of return static switch this throw true try typeof undefined var void while yield'.split(' '),
  ),
  cpp: new Set(
    'auto bool break case catch char class const continue default delete do double else false float for if int long namespace new nullptr private protected public return short signed sizeof static struct switch template this throw true try typename unsigned using void while'.split(' '),
  ),
}

// One alternation per language, tried at each position; the group that matched gives the type.
// Order matters: comments and strings before operators (// and /), numbers before identifiers.
const COMMENT: Record<Language, string> = {
  python: '#[^\\n]*',
  java: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
  javascript: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
  cpp: '//[^\\n]*|/\\*[\\s\\S]*?\\*/',
}
const STRING: Record<Language, string> = {
  python: `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'`,
  java: `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'`,
  javascript: `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\``,
  cpp: `"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'`,
}

function scanner(language: Language) {
  return new RegExp(
    [
      `(${COMMENT[language]})`,
      `(${STRING[language]})`,
      // C++ preprocessor lines start with # (#include): shown as a keyword.
      language === 'cpp' ? '(#[a-z]+)' : '((?!))',
      '(\\b\\d+(?:\\.\\d+)?\\b)',
      '([A-Za-z_][A-Za-z0-9_]*)',
      '([+\\-*/%=<>!&|^~?:]+)',
      '(\\s+|.)',
    ].join('|'),
    'gy',
  )
}

export function tokenize(code: string, language: Language): Token[] {
  const tokens: Token[] = []
  const push = (type: TokenType, text: string) => {
    const last = tokens[tokens.length - 1]
    if (last && last[0] === type) last[1] += text
    else tokens.push([type, text])
  }
  const pattern = scanner(language)
  let match: RegExpExecArray | null
  while ((match = pattern.exec(code)) !== null) {
    const [, comment, string, directive, number, word, operator, other] = match
    if (comment) push('comment', comment)
    else if (string) push('string', string)
    else if (directive) push('keyword', directive)
    else if (number) push('number', number)
    else if (word) {
      // A name followed by "(" is a call or a definition.
      const after = code.slice(pattern.lastIndex).match(/^\s*\(/)
      push(KEYWORDS[language].has(word) ? 'keyword' : after ? 'function' : 'plain', word)
    } else if (operator) push('operator', operator)
    else push('plain', other)
    if (pattern.lastIndex >= code.length) break
  }
  return tokens
}

// The tokens, or null when they would not give back the exact code (then show it plain).
export function highlight(code: string, language: Language): Token[] | null {
  const tokens = tokenize(code, language)
  return tokens.map(([, text]) => text).join('') === code ? tokens : null
}

// The colour of each piece (syntax tokens in index.css, checked at 4.5:1 on bg-code in both themes).
export const TOKEN_CLASS: Record<TokenType, string> = {
  keyword: 'text-syntax-keyword',
  function: 'text-syntax-function',
  number: 'text-syntax-number',
  string: 'text-syntax-string',
  comment: 'text-syntax-comment',
  operator: 'text-syntax-operator',
  plain: '',
}
