import { lazy, Suspense } from 'react'
import { CAPTCHA_ON } from '../api'

// Cloudflare Turnstile (README "Captcha"). Nothing without a site key (CAPTCHA_ON in api.ts). The widget
// and Cloudflare's script load only when a form shows it.

const Turnstile = lazy(() => import('./Turnstile'))

type CaptchaProps = {
  // A fresh token, or '' when there is none (expired, failed, not solved yet).
  onToken: (token: string) => void
  // The server refused the last token (422 on turnstile_token).
  rejected?: boolean
}

// The widget's height is reserved before anything loads, so nothing below it moves: 65 px for the
// flexible widget, 140 px for the compact one used below 300 px of width (Turnstile's flexible minimum).
// Remount it (a new `key`) after every failed submit: a token works only once.
export default function Captcha({ onToken, rejected = false }: CaptchaProps) {
  if (!CAPTCHA_ON) return null
  return (
    <div className="@container">
      <Suspense fallback={<div className="min-h-[65px] @max-[299px]:min-h-[140px]" />}>
        <Turnstile onToken={onToken} rejected={rejected} />
      </Suspense>
    </div>
  )
}
