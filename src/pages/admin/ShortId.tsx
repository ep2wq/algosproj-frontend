import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// The first 8 characters of an id and a button that copies the whole id; "Copied" is announced.
export default function ShortId({ id }: { id: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function copy() {
    void navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  const label = t('admin.common.copyId', { id })
  return (
    <span className="inline-flex items-center gap-0.5">
      <span title={id} className="font-mono text-xs text-muted">
        <span aria-hidden="true">{id.length > 8 ? `${id.slice(0, 8)}…` : id}</span>
        <span className="sr-only">{id}</span>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={label}
        className="inline-flex size-11 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink sm:pointer-fine:size-7"
      >
        {copied ? <Check aria-hidden="true" className="size-3.5 text-pass" /> : <Copy aria-hidden="true" className="size-3.5" />}
      </button>
      <span role="status" className="sr-only">
        {copied ? t('admin.common.copied') : ''}
      </span>
    </span>
  )
}
