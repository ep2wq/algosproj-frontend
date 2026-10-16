type TextAreaFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  errors?: string[]
}

// A labelled monospace textarea with the server's errors under it, like Field.
export default function TextAreaField({ id, label, value, onChange, rows = 4, errors }: TextAreaFieldProps) {
  const errorId = `${id}-error`
  const hasError = Boolean(errors && errors.length > 0)

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck={false}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`mt-1 block w-full rounded border bg-surface px-3 py-2 font-mono text-sm text-ink ${
          hasError ? 'border-fail' : 'border-field hover:border-muted'
        }`}
      />
      {hasError && (
        <p id={errorId} className="mt-1 text-sm text-fail">
          {errors!.join(' ')}
        </p>
      )}
    </div>
  )
}
