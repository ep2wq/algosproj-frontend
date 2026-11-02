// The list tables of the admin area and Challenges: a surface card, line rows at least 44 px tall
// with the hover background, a small muted header row. Below md the pages show the same rows as
// stacked cards (cardList), from md the table (tableCard).
export const tableCard = 'mt-4 hidden overflow-hidden rounded-lg border border-line bg-surface md:block'
export const table = 'w-full table-fixed text-start text-sm'
export const headRow = 'border-b border-line bg-hover/60 text-xs text-muted'
export const th = 'px-3 py-2 font-medium'
export const row = 'h-11 border-b border-line last:border-b-0 hover:bg-hover'
export const td = 'px-3 py-2 align-middle'
// Numbers: end-aligned, mono, digits of one width.
export const num = 'text-end font-mono tabular-nums'
export const cardList = 'mt-4 divide-y divide-line rounded-lg border border-line bg-surface md:hidden'
// A primary link in a row: ink, underlined on hover; the focus ring is the global one.
export const rowLink = 'rounded text-ink underline-offset-4 hover:underline'
// One long value (email, id, slug) on one line with an ellipsis; the element keeps the full text
// (screen readers read it) and a title shows it on hover.
export const truncate = 'block min-w-0 truncate'
