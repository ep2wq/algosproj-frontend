import type { SearchFrame } from './binarySearchFrames'
import { useCentreCells, useScrollCue } from './useScrollCue'

function inRange(frame: SearchFrame, index: number) {
  return frame.possible !== null && index >= frame.possible[0] && index <= frame.possible[1]
}

function cellStyle(frame: SearchFrame, index: number) {
  if (frame.result === index) return 'border-pass bg-pass text-inverse'
  if (frame.mid === index) return 'border-warn bg-warn text-inverse'
  if (inRange(frame, index)) return 'border-muted bg-surface text-ink'
  return 'border-line bg-paper text-muted'
}

// The cell the step is about: the found cell, else the middle, else the start of the range.
function currentIndex(frame: SearchFrame) {
  if (frame.result !== null && frame.result >= 0) return frame.result
  return frame.mid ?? frame.possible?.[0] ?? null
}

function pointerLabels(frame: SearchFrame, index: number) {
  const labels = []
  if (frame.low === index) labels.push('L')
  if (frame.mid === index) labels.push('M')
  if (frame.high === index) labels.push('H')
  return labels.join(' ')
}

// One step of a binary search drawn as a row of cells: pointers (L, M, H) above, the value in a
// box, the index below. Shared by the binary search lesson, the landing page and the 404 page. The
// row stays one line and scrolls sideways inside its box when wider than the screen, with the
// end-edge fade, and each step centres the current cell. Always left to right.
export default function SearchCells({
  frame,
  regionLabel,
  imageLabel,
  className = 'mt-4',
}: {
  frame: SearchFrame
  regionLabel: string
  imageLabel: string
  className?: string
}) {
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const focusIndex = currentIndex(frame)

  useCentreCells(scrollRef, focusIndex, focusIndex, frame.array)

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={regionLabel}
      dir="ltr"
      ref={scrollRef}
      className={`${className} overflow-x-auto rounded-lg border border-line bg-surface p-3${scrollMore ? ' scroll-fade' : ''}`}
    >
      <div role="img" aria-label={imageLabel} className="flex w-max gap-x-1.5">
        {frame.array.map((value, index) => (
          <div key={index} data-index={index} className="flex w-10 flex-col items-center">
            <span className="h-4 text-xs font-semibold text-ink">{pointerLabels(frame, index)}</span>
            <span
              className={`mt-0.5 flex size-10 items-center justify-center rounded border-2 font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${cellStyle(frame, index)}`}
            >
              {value}
            </span>
            <span className="mt-0.5 font-mono text-xs text-muted tabular-nums">{index}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
