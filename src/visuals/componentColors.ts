// One colour per component or island, in the order they are found; repeats after ten.
// Class names are written out in full so Tailwind generates them. Dark mode swaps the light fill
// and dark outline for a dark fill and light outline, so text-ink and fill-ink stay readable.
export const COMPONENT_COLORS = [
  { fill: 'fill-sky-300 dark:fill-sky-900', stroke: 'stroke-sky-800 dark:stroke-sky-300', bg: 'bg-sky-300 dark:bg-sky-900', border: 'border-sky-800 dark:border-sky-300' },
  { fill: 'fill-amber-300 dark:fill-amber-900', stroke: 'stroke-amber-800 dark:stroke-amber-300', bg: 'bg-amber-300 dark:bg-amber-900', border: 'border-amber-800 dark:border-amber-300' },
  { fill: 'fill-emerald-300 dark:fill-emerald-900', stroke: 'stroke-emerald-800 dark:stroke-emerald-300', bg: 'bg-emerald-300 dark:bg-emerald-900', border: 'border-emerald-800 dark:border-emerald-300' },
  { fill: 'fill-violet-300 dark:fill-violet-900', stroke: 'stroke-violet-800 dark:stroke-violet-300', bg: 'bg-violet-300 dark:bg-violet-900', border: 'border-violet-800 dark:border-violet-300' },
  { fill: 'fill-rose-300 dark:fill-rose-900', stroke: 'stroke-rose-800 dark:stroke-rose-300', bg: 'bg-rose-300 dark:bg-rose-900', border: 'border-rose-800 dark:border-rose-300' },
  { fill: 'fill-lime-300 dark:fill-lime-900', stroke: 'stroke-lime-800 dark:stroke-lime-300', bg: 'bg-lime-300 dark:bg-lime-900', border: 'border-lime-800 dark:border-lime-300' },
  { fill: 'fill-cyan-300 dark:fill-cyan-900', stroke: 'stroke-cyan-800 dark:stroke-cyan-300', bg: 'bg-cyan-300 dark:bg-cyan-900', border: 'border-cyan-800 dark:border-cyan-300' },
  { fill: 'fill-fuchsia-300 dark:fill-fuchsia-900', stroke: 'stroke-fuchsia-800 dark:stroke-fuchsia-300', bg: 'bg-fuchsia-300 dark:bg-fuchsia-900', border: 'border-fuchsia-800 dark:border-fuchsia-300' },
  { fill: 'fill-orange-300 dark:fill-orange-900', stroke: 'stroke-orange-800 dark:stroke-orange-300', bg: 'bg-orange-300 dark:bg-orange-900', border: 'border-orange-800 dark:border-orange-300' },
  { fill: 'fill-indigo-300 dark:fill-indigo-900', stroke: 'stroke-indigo-800 dark:stroke-indigo-300', bg: 'bg-indigo-300 dark:bg-indigo-900', border: 'border-indigo-800 dark:border-indigo-300' },
]

// Component or island numbers start at 1.
export function componentColor(id: number) {
  return COMPONENT_COLORS[(id - 1) % COMPONENT_COLORS.length]
}
