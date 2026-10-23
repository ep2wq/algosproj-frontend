import { useEffect, useRef } from 'react'

// How far the reader has scrolled, as a 3 px accent bar at the top of the window, on pages where
// reading length matters (lessons, About, FAQ, the legal pages). Decorative: the scroll bar already
// says it, so it is hidden from screen readers. One passive listener and at most one write per frame,
// straight to the element's transform, so scrolling never re-renders the page. No easing: the scroll
// is the motion (and nothing to turn off under reduced motion). Fills from the start edge, so from the
// right in Arabic. Nothing shows when the page does not scroll.
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const root = document.documentElement
      const range = root.scrollHeight - root.clientHeight
      const ratio = range > 0 ? Math.min(1, Math.max(0, root.scrollTop / range)) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // The page grows when a visualization or the editor arrives.
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={bar}
      aria-hidden="true"
      style={{ transform: 'scaleX(0)' }}
      className="pointer-events-none fixed inset-x-0 top-0 z-20 h-[3px] origin-left bg-accent rtl:origin-right"
    />
  )
}
