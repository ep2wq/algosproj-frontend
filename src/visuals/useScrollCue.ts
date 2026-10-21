import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// For a drawing that can scroll sideways: more is true while part of it is hidden past the end
// edge, so the box can fade that edge (the scroll-fade utility) until it is scrolled to the end.
// Drawings are always left to right, so the end is on the right.
export function useScrollCue<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const box = ref.current
    if (!box) return
    const update = () => setMore(box.scrollWidth - box.clientWidth - box.scrollLeft > 4)
    update()
    box.addEventListener('scroll', update, { passive: true })
    // The box resizes with the window; its content when a new step or input changes the drawing.
    const observer = new ResizeObserver(update)
    observer.observe(box)
    for (const child of box.children) observer.observe(child)
    return () => {
      box.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  return [ref, more] as const
}

// On a narrow screen a row of cells (marked data-index) scrolls inside its box: centre the cells
// first..last (one cell, or the span between two pointers), so the pointers around them stay in
// view as far as they fit. No smooth scroll, so nothing new moves. content is whatever redraws the
// row (the input), so a new input re-centres. A layout effect, so the old position never paints.
export function useCentreCells(ref: RefObject<HTMLElement | null>, first: number | null, last: number | null, content: unknown) {
  useLayoutEffect(() => {
    const box = ref.current
    if (first === null || last === null) return
    const start = box?.querySelector<HTMLElement>(`[data-index="${first}"]`)
    const end = box?.querySelector<HTMLElement>(`[data-index="${last}"]`)
    if (!box || !start || !end) return
    const boxRect = box.getBoundingClientRect()
    const startRect = start.getBoundingClientRect()
    const endRect = end.getBoundingClientRect()
    const style = getComputedStyle(box)
    const room = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    // If first..last is wider than the box, centre the first cell alone instead of cutting off both ends.
    const right = endRect.right - startRect.left <= room ? endRect.right : startRect.right
    box.scrollLeft += (startRect.left + right) / 2 - (boxRect.left + boxRect.width / 2)
  }, [ref, first, last, content])
}
