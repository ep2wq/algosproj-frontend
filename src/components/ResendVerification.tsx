import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, resendVerification } from '../api'
import { useAuth } from '../auth'

// After a send (or a 429) the button waits a minute. Shared by every Resend button on the page
// (the notice, the challenge page, /verify-email), so two buttons can't double the requests.
const COOLDOWN_MS = 60_000
let cooldownUntil = 0

// "Resend email" with one polite status line. The countdown is only shown, not announced: the
// status sentence already says to wait a minute.
export default function ResendVerification({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { refreshUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const waiting = secondsLeft > 0

  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [waiting])

  async function handleClick() {
    // aria-disabled, not disabled: the button keeps focus while it waits.
    if (busy || waiting) return
    setBusy(true)
    setStatus(null)
    try {
      await resendVerification()
      cooldownUntil = Date.now() + COOLDOWN_MS
      setStatus({ text: t('verify.sent'), error: false })
      // Already verified (in another tab, say): the notice goes away.
      refreshUser().catch(() => {})
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        cooldownUntil = Date.now() + COOLDOWN_MS
        setStatus({ text: t('verify.tooMany'), error: true })
      } else {
        setStatus({ text: err instanceof ApiError ? err.message : t('common.genericError'), error: true })
      }
    } finally {
      setNow(Date.now())
      setBusy(false)
    }
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={busy || waiting}
        className="inline-flex min-h-11 items-center rounded px-1 font-medium text-accent underline underline-offset-2 hover:no-underline aria-disabled:cursor-not-allowed aria-disabled:text-muted aria-disabled:no-underline sm:pointer-fine:min-h-8"
      >
        {busy ? t('verify.sending') : t('verify.resend')}
        {waiting && (
          <span aria-hidden="true" className="ms-1 tabular-nums">
            {t('verify.wait', { seconds: secondsLeft })}
          </span>
        )}
      </button>
      {/* Always in the page, so the first message is announced too. */}
      <span role="status" className={status?.error ? 'text-fail' : 'text-ink'}>
        {status?.text}
      </span>
    </span>
  )
}
