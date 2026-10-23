import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api'

// A Delete button that asks "Delete X?" in place before calling onConfirm. A refusal from the
// server (such as 409 when users already solved a problem) is shown next to the button.
export default function DeleteButton({ what, onConfirm }: { what: string; onConfirm: () => Promise<void> }) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.common.deleteFailed'))
      setConfirming(false)
    }
    setBusy(false)
  }

  return (
    <div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t('admin.common.deleteQuestion', { what })}</span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="rounded bg-fail px-3 py-1 text-sm font-medium text-inverse hover:bg-fail/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('admin.common.deleting') : t('admin.common.yesDelete')}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded border border-line bg-surface px-3 py-1 text-sm hover:border-muted"
          >
            {t('admin.common.cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded border border-fail/40 bg-surface px-3 py-1 text-sm text-fail hover:bg-fail/5"
        >
          {t('admin.common.delete')}
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
