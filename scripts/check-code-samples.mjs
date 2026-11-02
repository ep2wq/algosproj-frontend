// Checks that the landing page's coloured code samples (BINARY_SEARCH_LINES in src/codeSamples.ts)
// are exactly the sample text (BINARY_SEARCH_SAMPLES): joined line by line, the pieces must give back
// every character, so splitting the code for colours can never change it. Prints nothing and exits 0
// when they match (npm run lint). Node reads the TypeScript file directly (type stripping).
import { BINARY_SEARCH_LINES, BINARY_SEARCH_SAMPLES } from '../src/codeSamples.ts'

const TYPES = new Set(['keyword', 'function', 'number', 'string', 'comment', 'operator', 'plain'])
const errors = []
for (const [language, text] of Object.entries(BINARY_SEARCH_SAMPLES)) {
  const lines = BINARY_SEARCH_LINES[language]
  if (!lines) {
    errors.push(`${language}: no coloured lines`)
    continue
  }
  for (const line of lines) {
    for (const [type] of line) if (!TYPES.has(type)) errors.push(`${language}: unknown token type "${type}"`)
  }
  const joined = lines.map((line) => line.map(([, piece]) => piece).join('')).join('\n') + '\n'
  if (joined !== text) errors.push(`${language}: the coloured lines differ from the sample text`)
}
if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
