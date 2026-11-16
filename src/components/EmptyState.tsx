import { AlignLeft } from 'lucide-react'
import type { ReactNode } from 'react'

// A section with nothing in it keeps its frame: a dashed box with one sentence (and an action, if
// there is one). The icon is decoration; the sentence says it all.
export default function EmptyState({ children, className = 'mt-6' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${className} flex items-start gap-3 rounded-lg border border-dashed border-field px-4 py-5 text-muted`}>
      <AlignLeft aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
