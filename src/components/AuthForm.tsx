import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type AuthFormProps = {
  title: string
  submitLabel: string
  busyLabel: string
  busy: boolean
  error: ReactNode
  onSubmit: () => void
  footer: ReactNode
  children: ReactNode
}

// Shared frame for the login and register pages.
export default function AuthForm({ title, submitLabel, busyLabel, busy, error, onSubmit, footer, children }: AuthFormProps) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)

  // When a submit fails (busy goes back to false), focus the first field the server marked
  // invalid, so its label and error are read out. A successful submit leaves the page instead.
  useEffect(() => {
    if (!busy) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [busy])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!busy) onSubmit()
  }

  return (
    <div className="mx-auto max-w-sm">
      <title>{t('titles.page', { name: title })}</title>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {children}
        {error && (
          <p role="alert" className="rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-fail">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-accent px-4 py-2 font-medium text-inverse hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">{footer}</p>
    </div>
  )
}
