import { useEffect, useState, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Loading states (docs/ui-polish.md outside this repo). Nothing shows for the first 200 ms, so a
// fast answer never flashes a placeholder, but the space is taken at once, so nothing jumps.
const DELAY_MS = 200

function useShown() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])
  return shown
}

// One polite status line for the whole region; it stays empty until the delay is over, so a fast
// answer announces nothing. It sits next to the busy region, not in it: screen readers may hold back
// live updates inside an aria-busy element.
function Status({ label, shown }: { label: string; shown: boolean }) {
  return (
    <p role="status" className="sr-only">
      {shown ? label : ''}
    </p>
  )
}

// A region whose data is loading: the skeleton in the shape of the content, which replaces the whole
// region when it arrives. The skeleton is hidden from screen readers and inert (anything in it can't
// be focused or clicked). Focus is never moved.
export function LoadingRegion({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const shown = useShown()
  return (
    <>
      <Status label={label} shown={shown} />
      <div aria-busy="true" className={className}>
        <div aria-hidden="true" inert className={cn(!shown && 'invisible')}>
          {children}
        </div>
      </div>
    </>
  )
}

// Lines of text: one bar per line at the surrounding font size and line height (1lh), so the block
// is as tall as the text it stands for, in Arabic too. The last line is shorter.
export function SkeletonLines({ lines, className }: { lines: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="flex h-lh items-center">
          <Skeleton className={cn('h-[0.6em]', index === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
        </div>
      ))}
    </div>
  )
}
