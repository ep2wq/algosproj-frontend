// Small status icons drawn in one 16 px outline style. Always decoration next to a word that
// carries the meaning, so they are hidden from screen readers.
const base = {
  'aria-hidden': true,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function CheckIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 8.5l3 3 6-7" pathLength={24} />
    </svg>
  )
}

export function CrossIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  )
}

export function AlertIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5M8 11h.01" />
    </svg>
  )
}
