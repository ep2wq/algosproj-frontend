import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TURNSTILE_SITE_KEY } from '../api'
import { useTheme } from '../theme'

// Lazy part of Captcha.tsx: loads Cloudflare's script (once, on the first form that shows the widget)
// and renders the widget in the site's theme and language. The CSP in public/_headers allows
// challenges.cloudflare.com for script, frame and connect.
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string | undefined
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loading: Promise<void> | null = null

// A blocked or failed script is removed, so "Try again" loads it afresh.
function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      loading = null
      reject(new Error('Turnstile script failed to load'))
    }
    document.head.append(script)
  })
  return loading
}

export default function Turnstile({ onToken, rejected }: { onToken: (token: string) => void; rejected: boolean }) {
  const { t, i18n } = useTranslation()
  const { dark } = useTheme()
  const language = i18n.language === 'ar' ? 'ar' : 'en'
  const hostRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  // 'load': the script was blocked or failed; 'widget': the widget loaded but reported an error.
  const [failed, setFailed] = useState<'load' | 'widget' | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    onTokenRef.current = onToken
  })

  // Rendered again (with no token) when the theme or the language changes, or on "Try again".
  useEffect(() => {
    const host = hostRef.current
    let active = true
    let widgetId: string | undefined
    loadScript().then(
      () => {
        if (!active || !host || !window.turnstile) return
        // render throws on a bad option (a wrong site key in the build, say): show the error, not an empty box.
        try {
          widgetId = window.turnstile.render(host, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: dark ? 'dark' : 'light',
            language,
            size: host.clientWidth < 300 ? 'compact' : 'flexible',
            callback: (token: string) => onTokenRef.current(token),
            'expired-callback': () => onTokenRef.current(''),
            'timeout-callback': () => onTokenRef.current(''),
            // Returning true tells Turnstile the error is handled here.
            'error-callback': () => {
              onTokenRef.current('')
              setFailed('widget')
              return true
            },
          })
        } catch {
          setFailed('widget')
        }
      },
      () => {
        if (active) setFailed('load')
      },
    )
    return () => {
      active = false
      if (widgetId !== undefined) window.turnstile?.remove(widgetId)
      onTokenRef.current('')
    }
  }, [dark, language, attempt])

  return (
    <div role="group" aria-label={t('captcha.label')}>
      <div ref={hostRef} className="min-h-[65px] @max-[299px]:min-h-[140px]" />
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-fail">
          {failed === 'load' ? t('captcha.loadFailed') : t('captcha.widgetFailed')}{' '}
          <button
            type="button"
            onClick={() => {
              setFailed(null)
              setAttempt(attempt + 1)
            }}
            className="inline-flex min-h-11 items-center rounded font-medium text-accent underline underline-offset-2 sm:pointer-fine:min-h-6"
          >
            {t('captcha.retry')}
          </button>
        </p>
      ) : (
        rejected && (
          <p role="alert" className="mt-2 text-sm text-fail">
            {t('captcha.failed')}
          </p>
        )
      )}
    </div>
  )
}
