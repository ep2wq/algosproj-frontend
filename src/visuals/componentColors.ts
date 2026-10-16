// One colour per component or island, in the order they are found; repeats after ten.
// Class names are written out in full so Tailwind generates them. Dark mode swaps the light fill
// and dark outline for a dark fill and light outline, so text-ink and fill-ink stay readable.
export const COMPONENT_COLORS = [
  { fill: 'fill-sky-200 dark:fill-sky-900', stroke: 'stroke-sky-700 dark:stroke-sky-300', bg: 'bg-sky-200 dark:bg-sky-900', border: 'border-sky-700 dark:border-sky-300' },
  { fill: 'fill-amber-200 dark:fill-amber-900', stroke: 'stroke-amber-700 dark:stroke-amber-300', bg: 'bg-amber-200 dark:bg-amber-900', border: 'border-amber-700 dark:border-amber-300' },
  { fill: 'fill-emerald-200 dark:fill-emerald-900', stroke: 'stroke-emerald-700 dark:stroke-emerald-300', bg: 'bg-emerald-200 dark:bg-emerald-900', border: 'border-emerald-700 dark:border-emerald-300' },
  { fill: 'fill-violet-200 dark:fill-violet-900', stroke: 'stroke-violet-700 dark:stroke-violet-300', bg: 'bg-violet-200 dark:bg-violet-900', border: 'border-violet-700 dark:border-violet-300' },
  { fill: 'fill-rose-200 dark:fill-rose-900', stroke: 'stroke-rose-700 dark:stroke-rose-300', bg: 'bg-rose-200 dark:bg-rose-900', border: 'border-rose-700 dark:border-rose-300' },
  { fill: 'fill-lime-200 dark:fill-lime-900', stroke: 'stroke-lime-700 dark:stroke-lime-300', bg: 'bg-lime-200 dark:bg-lime-900', border: 'border-lime-700 dark:border-lime-300' },
  { fill: 'fill-cyan-200 dark:fill-cyan-900', stroke: 'stroke-cyan-700 dark:stroke-cyan-300', bg: 'bg-cyan-200 dark:bg-cyan-900', border: 'border-cyan-700 dark:border-cyan-300' },
  { fill: 'fill-fuchsia-200 dark:fill-fuchsia-900', stroke: 'stroke-fuchsia-700 dark:stroke-fuchsia-300', bg: 'bg-fuchsia-200 dark:bg-fuchsia-900', border: 'border-fuchsia-700 dark:border-fuchsia-300' },
  { fill: 'fill-orange-200 dark:fill-orange-900', stroke: 'stroke-orange-700 dark:stroke-orange-300', bg: 'bg-orange-200 dark:bg-orange-900', border: 'border-orange-700 dark:border-orange-300' },
  { fill: 'fill-indigo-200 dark:fill-indigo-900', stroke: 'stroke-indigo-700 dark:stroke-indigo-300', bg: 'bg-indigo-200 dark:bg-indigo-900', border: 'border-indigo-700 dark:border-indigo-300' },
]

// Component or island numbers start at 1.
export function componentColor(id: number) {
  return COMPONENT_COLORS[(id - 1) % COMPONENT_COLORS.length]
}
