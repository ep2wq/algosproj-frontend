import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type FieldProps = {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  errors?: string[]
  required?: boolean
  // For an Arabic field in the admin forms: dir="rtl" lang="ar".
  dir?: 'rtl'
  lang?: string
  hint?: string
}

export default function Field({ id, label, type = 'text', value, onChange, autoComplete, errors, required = true, dir, lang, hint }: FieldProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const hasError = Boolean(errors && errors.length > 0)
  const isPassword = type === 'password'
  const describedBy = [hint ? hintId : '', hasError ? errorId : ''].filter(Boolean).join(' ') || undefined
  const hintEl = hint && (
    <p id={hintId} className="mt-1 text-sm text-muted">
      {hint}
    </p>
  )

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={isPassword && visible ? 'text' : type}
        // Email addresses always read left to right, also on Arabic pages.
        dir={type === 'email' ? 'ltr' : dir}
        lang={lang}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded border bg-surface px-3 py-2 text-ink ${
          hasError ? 'border-fail' : 'border-field hover:border-muted'
        }`}
      />
      {isPassword ? (
        // After the input, so Tab goes from the field to its toggle (the hint, if any, shares the row).
        <div className="flex flex-wrap items-start justify-between gap-x-2">
          {hintEl || <span />}
          <button
            type="button"
            aria-controls={id}
            onClick={() => setVisible((v) => !v)}
            className="mt-1 inline-flex min-h-11 shrink-0 items-center rounded px-1 text-sm text-accent underline-offset-2 hover:underline sm:pointer-fine:min-h-6"
          >
            {t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
          </button>
        </div>
      ) : (
        hintEl
      )}
      {hasError && (
        // Field errors come from the server, in the page language (the admin area: English). The
        // span keeps the punctuation of an English message in place on an Arabic page.
        <p id={errorId} className="mt-1 text-sm text-fail">
          <span dir="auto">{errors!.join(' ')}</span>
        </p>
      )}
    </div>
  )
}
