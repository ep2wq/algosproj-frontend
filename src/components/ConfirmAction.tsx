import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api'

// A button that opens an in-page confirmation (no browser dialog) with optional inputs, then
// calls onConfirm. A refusal from the server (403, 409, 422) is shown under it.
export default function ConfirmAction({
  label,
  question,
  confirmLabel,
  danger = false,
  children,
  onConfirm,
  onClose,
}: {
  label: string
  question: string
  confirmLabel: string
  danger?: boolean
  children?: ReactNode
  onConfirm: () => Promise<void>
  onClose?: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setOpen(false)
    setError('')
    onClose?.()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      close()
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldMessages = Object.values(err.fieldErrors).flat()
        setError(fieldMessages.length > 0 ? fieldMessages.join(' ') : err.message)
      } else {
        setError(t('admin.common.genericError'))
      }
    }
    setBusy(false)
  }

  const confirmClass = danger
    ? 'rounded bg-fail px-3 py-1 text-sm font-medium text-inverse hover:bg-fail/90 disabled:opacity-60'
    : 'rounded bg-accent px-3 py-1 text-sm font-medium text-inverse hover:bg-accent/90 disabled:opacity-60'

  return (
    <div className="rounded border border-line bg-surface p-3">
      {open ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <p className="text-sm font-medium">{question}</p>
          {children}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={confirmClass}>
              {busy ? t('admin.common.working') : confirmLabel}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded border border-line bg-surface px-3 py-1 text-sm hover:border-muted"
            >
              {t('admin.common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            danger
              ? 'rounded border border-fail/40 bg-surface px-3 py-1 text-sm text-fail hover:bg-fail/5'
              : 'rounded border border-line bg-surface px-3 py-1 text-sm text-accent hover:border-muted'
          }
        >
          {label}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-fail">
          {error}
        </p>
      )}
    </div>
  )
}
