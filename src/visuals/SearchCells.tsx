import type { SearchFrame } from './binarySearchFrames'
import { useCentreCells, useScrollCue } from './useScrollCue'

// The fill and border of each kind of cell, shared with the lesson's legend so its swatches match.
// Cells still in range get a faint slate fill in light mode, so they read as boxes on the white card.
// oxlint-disable-next-line react/only-export-components
export const CELL_STYLES = {
  found: 'border-pass bg-pass',
  middle: 'border-warn bg-warn',
  possible: 'border-muted bg-slate-50 dark:bg-surface',
  ruledOut: 'border-line bg-paper',
}

function inRange(frame: SearchFrame, index: number) {
  return frame.possible !== null && index >= frame.possible[0] && index <= frame.possible[1]
}

function cellStyle(frame: SearchFrame, index: number) {
  if (frame.result === index) return `${CELL_STYLES.found} text-inverse`
  if (frame.mid === index) return `${CELL_STYLES.middle} text-inverse`
  if (inRange(frame, index)) return `${CELL_STYLES.possible} text-ink`
  return `${CELL_STYLES.ruledOut} text-muted`
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
  return labels
}

// One step of a binary search drawn as a row of cells: pointers (L, M, H) above, the value in a
// box, the index below. Shared by the binary search lesson, the landing page and the 404 page. The
// row stays one line and scrolls sideways inside its box when wider than the screen, with the
// end-edge fade, and each step centres the current cell. Always left to right. large (the landing
// hero): bigger cells from md, so ten of them use the width of the page; framed: its own bordered box.
export default function SearchCells({
  frame,
  regionLabel,
  imageLabel,
  className = 'mt-4',
  large = false,
  framed = true,
}: {
  frame: SearchFrame
  regionLabel: string
  imageLabel: string
  className?: string
  large?: boolean
  framed?: boolean
}) {
  const [scrollRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const focusIndex = currentIndex(frame)

  useCentreCells(scrollRef, focusIndex, focusIndex, frame.array)

  const width = large ? 'w-10 md:w-14 lg:w-16 xl:w-24' : 'w-10'
  const box = large ? 'size-10 md:size-14 md:text-lg lg:size-16 lg:text-xl xl:size-24 xl:text-2xl' : 'size-10'
  const small = large ? 'text-xs md:text-sm' : 'text-xs'

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={regionLabel}
      dir="ltr"
      ref={scrollRef}
      className={`${className} overflow-x-auto${framed ? ' rounded-lg border border-line bg-surface p-3' : ' rounded py-1'}${scrollMore ? ' scroll-fade' : ''}`}
    >
      <div role="img" aria-label={imageLabel} className={`mx-auto flex w-max ${large ? 'gap-x-1.5 md:gap-x-3' : 'gap-x-1.5'}`}>
        {frame.array.map((value, index) => (
          <div key={index} data-index={index} className={`flex flex-col items-center ${width}`}>
            {/* Pointers on one cell each get their own label, spaced apart (L M H, not "LMH"). */}
            <span className={`flex h-4 gap-1 font-semibold text-ink ${small} ${large ? 'md:h-5 md:gap-1.5' : ''}`}>
              {pointerLabels(frame, index).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </span>
            <span
              className={`mt-0.5 flex items-center justify-center rounded border-2 font-medium tabular-nums motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm ${box} ${cellStyle(frame, index)}`}
            >
              {value}
            </span>
            <span className={`mt-0.5 font-mono text-muted tabular-nums ${small}`}>{index}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
