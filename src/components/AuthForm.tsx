import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'

type AuthFormProps = {
  title: string
  submitLabel: string
  busyLabel: string
  busy: boolean
  error: ReactNode
  onSubmit: () => void
  footer: ReactNode
  children: ReactNode
  // A server error on accepted_terms (register only). Shown with our own message.
  termsErrors?: string[]
  // The Terms and Privacy box, on by default (login, register). The password reset forms leave it out.
  terms?: boolean
}

// Opens in a new tab, so a half-filled form is not lost; screen readers are told.
function NewTabLink({ href, children }: { href: string; children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="rounded text-accent underline underline-offset-2">
      {children}
      <span className="sr-only"> {t('auth.opensInNewTab')}</span>
    </a>
  )
}

// Shared frame for the login, register, forgot password and reset password pages.
export default function AuthForm({ title, submitLabel, busyLabel, busy, error, onSubmit, footer, children, termsErrors, terms = true }: AuthFormProps) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)
  const termsRef = useRef<HTMLInputElement>(null)
  // Accepting the Terms and Privacy policy. Starts unchecked on every visit and is never stored.
  const [accepted, setAccepted] = useState(false)
  const [termsMissing, setTermsMissing] = useState(false)
  const termsInvalid = termsMissing || Boolean(termsErrors?.length)

  // When a submit fails (busy goes back to false), focus the first field the server marked
  // invalid, so its label and error are read out. A successful submit leaves the page instead.
  useEffect(() => {
    if (!busy) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [busy])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    // Nothing is sent until the box is checked. The error is rendered before the focus moves, so
    // the box is read out with it.
    if (terms && !accepted) {
      flushSync(() => setTermsMissing(true))
      termsRef.current?.focus()
      return
    }
    onSubmit()
  }

  return (
    <div className="mx-auto max-w-sm">
      <title>{t('titles.page', { name: title })}</title>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {children}
        {terms && (
          <div>
            {/* A native checkbox like "Remember me" (Base UI's would add about 3 kB gzip to every page).
                The whole row is the label, so it is at least 44 px tall on a phone; clicking the text
                toggles the box, the links inside only open their page. */}
            <Label htmlFor="accept-terms" className="items-start py-3 font-normal sm:pointer-fine:py-1">
              <span className="flex h-5 shrink-0 items-center">
                <input
                  ref={termsRef}
                  id="accept-terms"
                  name="accept-terms"
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => {
                    setAccepted(event.target.checked)
                    if (event.target.checked) setTermsMissing(false)
                  }}
                  required
                  aria-invalid={termsInvalid}
                  aria-describedby={termsInvalid ? 'accept-terms-error' : undefined}
                  className="size-4 accent-accent"
                />
              </span>
              <span>
                <Trans i18nKey="auth.acceptTerms" components={{ terms: <NewTabLink href="/terms" />, privacy: <NewTabLink href="/privacy" /> }} />
              </span>
            </Label>
            {termsInvalid && (
              <p id="accept-terms-error" className="ps-6 text-sm text-fail">
                {t('auth.acceptTermsError')}
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-fail">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded bg-accent px-4 font-medium text-inverse hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">{footer}</p>
    </div>
  )
}
