// One colour per component or island, in the order they are found; repeats after ten.
// Class names are written out in full so Tailwind generates them.
export const COMPONENT_COLORS = [
  { fill: 'fill-sky-200', stroke: 'stroke-sky-700', bg: 'bg-sky-200', border: 'border-sky-700' },
  { fill: 'fill-amber-200', stroke: 'stroke-amber-700', bg: 'bg-amber-200', border: 'border-amber-700' },
  { fill: 'fill-emerald-200', stroke: 'stroke-emerald-700', bg: 'bg-emerald-200', border: 'border-emerald-700' },
  { fill: 'fill-violet-200', stroke: 'stroke-violet-700', bg: 'bg-violet-200', border: 'border-violet-700' },
  { fill: 'fill-rose-200', stroke: 'stroke-rose-700', bg: 'bg-rose-200', border: 'border-rose-700' },
  { fill: 'fill-lime-200', stroke: 'stroke-lime-700', bg: 'bg-lime-200', border: 'border-lime-700' },
  { fill: 'fill-cyan-200', stroke: 'stroke-cyan-700', bg: 'bg-cyan-200', border: 'border-cyan-700' },
  { fill: 'fill-fuchsia-200', stroke: 'stroke-fuchsia-700', bg: 'bg-fuchsia-200', border: 'border-fuchsia-700' },
  { fill: 'fill-orange-200', stroke: 'stroke-orange-700', bg: 'bg-orange-200', border: 'border-orange-700' },
  { fill: 'fill-indigo-200', stroke: 'stroke-indigo-700', bg: 'bg-indigo-200', border: 'border-indigo-700' },
]

// Component or island numbers start at 1.
export function componentColor(id: number) {
  return COMPONENT_COLORS[(id - 1) % COMPONENT_COLORS.length]
}
