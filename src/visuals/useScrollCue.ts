import { useEffect, useRef, useState } from 'react'

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
