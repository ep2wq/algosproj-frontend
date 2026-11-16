import { DUR, EASE, reducedMotion } from '../motion'

// Forgiving input (Postel: accept what people type, send one clean format). Output is always Western
// digits.

const ARABIC_INDIC = '٠'.charCodeAt(0) // ٠-٩
const EASTERN_ARABIC_INDIC = '۰'.charCodeAt(0) // ۰-۹
const FULL_WIDTH = '０'.charCodeAt(0) // ０-９

// Arabic-Indic, Eastern Arabic-Indic and full-width digits become 0-9.
export function westernDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹０-９]/g, (char) => {
    const code = char.charCodeAt(0)
    return String(code - (code >= FULL_WIDTH ? FULL_WIDTH : code >= EASTERN_ARABIC_INDIC ? EASTERN_ARABIC_INDIC : ARABIC_INDIC))
  })
}

// A list of numbers as one clean "1, 2, 3": digits made Western, the Arabic comma and semicolon read as
// commas, and spaces, tabs, new lines, commas and repeated separators all count as one separator.
// Bidi marks are dropped, the minus-like dashes become "-", and the Arabic decimal and thousands
// separators (٫ ٬) are separators like the comma. A comma always separates: "1,000" is the list 1, 000
// (numberParts marks "000" so it is refused), never the number one thousand.
// Everything else (letters, a decimal point) is left for the caller's own parsing.
export function normalizeNumberInput(text: string): string {
  return westernDigits(text)
    .replace(/[‎‏؜⁦-⁩]/g, '')
    .replace(/[،؛，;٫٬]/g, ',')
    .replace(/[－–—﹣−]/g, '-')
    .split(/[\s,]+/)
    .filter(Boolean)
    .join(', ')
}

// The parts of a list of numbers as typed ("١، ٢ 3" gives ["1", "2", "3"]); each caller checks them.
export function numberParts(text: string): string[] {
  const clean = normalizeNumberInput(text)
  // An item with a leading zero ("000" from "1,000") is marked with a "#" so every caller's check
  // refuses it; only "0" itself is a number written with a zero first.
  return clean ? clean.split(', ').map((part) => (/^-?0\d/.test(part) ? `#${part}` : part)) : []
}

// Search matching: lower case, trimmed, alef forms (أ إ آ) as ا, ta marbuta ة as ه, tashkeel and
// tatweel ignored. Apply it to both the query and the text searched.
export function normalizeSearch(text: string): string {
  return westernDigits(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim()
}

// An invalid field shakes once: two cycles of 4 px sideways over --dur-move (the shake keyframes in
// index.css, as a Web Animation so a field that already has focus is not remounted). Nothing moves
// under reduced motion. Symmetric, so the same in RTL.
export function shakeElement(element: HTMLElement | null) {
  if (!element || reducedMotion() || typeof element.animate !== 'function') return
  element.animate(
    [0, 4, -4, 4, -4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: DUR.move, easing: EASE.out },
  )
}
