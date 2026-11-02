import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { CrossIcon } from './Icons'
import ResendVerification from './ResendVerification'

// For a logged-in user whose email is not verified yet: a strip hanging below the sticky header.
// Its height (--notice-h) is added to the top padding of <main> (Layout), so the top of every page
// (a back link, a heading) sits below it, and to scroll-padding-top (index.css), so a focused or
// linked element is never hidden under it. Dismissed until the next page load (nothing is stored).
export default function VerifyEmailNotice() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const shown = Boolean(user && !user.email_verified && !dismissed)

  useEffect(() => {
    const element = ref.current
    if (!shown || !element) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty('--notice-h', `${element.offsetHeight}px`))
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--notice-h')
    }
  }, [shown])

  if (!shown) return null

  return (
    <div ref={ref} className="absolute inset-x-0 top-full border-b border-line bg-accent-soft text-sm text-ink">
      <div className="site-container flex flex-wrap items-center gap-x-3 py-1 sm:pointer-fine:py-1.5">
        <p className="min-w-0 flex-[1_1_16rem] py-2 sm:pointer-fine:py-0">{t('verify.notice')}</p>
        <ResendVerification />
        <button
          type="button"
          onClick={() => {
            setDismissed(true)
            // The focused button goes away; continue from the page content.
            document.getElementById('main')?.focus({ preventScroll: true })
          }}
          aria-label={t('verify.dismiss')}
          className="-me-2 ms-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded text-muted hover:text-ink sm:pointer-fine:min-h-8 sm:pointer-fine:min-w-8"
        >
          <CrossIcon />
        </button>
      </div>
    </div>
  )
}
