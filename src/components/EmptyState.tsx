import type { ReactNode } from 'react'

// A section with nothing in it keeps its frame: a dashed box with one sentence (and an action, if
// there is one). The icon is decoration; the sentence says it all.
export default function EmptyState({ children, className = 'mt-6' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${className} flex items-start gap-3 rounded-lg border border-dashed border-field px-4 py-5 text-muted`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M4 12h10M4 17h6" />
      </svg>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
