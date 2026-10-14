import type { FormEvent, ReactNode } from 'react'

type AuthFormProps = {
  title: string
  submitLabel: string
  busyLabel: string
  busy: boolean
  error: string
  onSubmit: () => void
  footer: ReactNode
  children: ReactNode
}

// Shared frame for the login and register pages.
export default function AuthForm({ title, submitLabel, busyLabel, busy, error, onSubmit, footer, children }: AuthFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {children}
        {error && (
          <p role="alert" className="rounded border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-fail">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? busyLabel : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">{footer}</p>
    </div>
  )
}
