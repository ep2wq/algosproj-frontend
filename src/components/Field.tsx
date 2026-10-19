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
}

export default function Field({ id, label, type = 'text', value, onChange, autoComplete, errors, required = true, dir, lang }: FieldProps) {
  const errorId = `${id}-error`
  const hasError = Boolean(errors && errors.length > 0)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        // Email addresses always read left to right, also on Arabic pages.
        dir={type === 'email' ? 'ltr' : dir}
        lang={lang}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`mt-1 block w-full rounded border bg-surface px-3 py-2 text-ink ${
          hasError ? 'border-fail' : 'border-field hover:border-muted'
        }`}
      />
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
