import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LEGAL_UPDATED } from '../site'

// The value is the date of the legal texts, so the notice comes back when they change.
const KEY = 'cookie-notice'

// Says which cookies and storage the site uses. Only informs: everything is strictly necessary or a
// setting the visitor chose, so there is nothing to accept or refuse. Decided after mount (nothing in
// the prerendered HTML, no layout shift: it is fixed). With storage blocked it shows on every visit.
// While shown, its height pads the page bottom and scroll-padding-bottom (--cookie-h in index.css),
// so the last links and anything focused stay above it.
export default function CookieNotice() {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // After the first frame is painted, so it never delays the page's own first paint (LCP).
  useEffect(() => {
    let timer = 0
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        let seen: string | null = null
        try {
          seen = localStorage.getItem(KEY)
        } catch {
          // Blocked storage: show it.
        }
        if (seen !== LEGAL_UPDATED) setShown(true)
      })
    })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!shown || !element) return
    const root = document.documentElement
    // Its height plus the gap under it (it floats above the bottom edge from sm up).
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--cookie-h', `${element.offsetHeight + parseFloat(getComputedStyle(element).bottom)}px`),
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--cookie-h')
    }
  }, [shown])

  function dismiss() {
    try {
      localStorage.setItem(KEY, LEGAL_UPDATED)
    } catch {
      // Not stored: it shows again on the next visit.
    }
    setShown(false)
    // The focused button goes away; continue from the page content.
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  if (!shown) return null

  return (
    <div
      ref={ref}
      role="region"
      aria-label={t('cookieNotice.label')}
      className="fixed inset-x-0 bottom-0 z-15 border-t border-line bg-surface text-sm text-ink shadow-(--float-shadow) motion-safe:animate-appear sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-3xl sm:rounded-lg sm:border"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <p className="min-w-0 flex-[1_1_20rem] py-1">{t('cookieNotice.text')}</p>
        <div className="flex items-center gap-4">
          <Link
            to="/cookies"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded text-accent underline underline-offset-2 hover:no-underline sm:pointer-fine:min-h-8"
          >
            {t('cookieNotice.policy')}
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded bg-accent px-4 font-medium text-inverse hover:bg-accent/90 sm:pointer-fine:min-h-8"
          >
            {t('cookieNotice.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}
