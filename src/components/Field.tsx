type FieldProps = {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  errors?: string[]
}

export default function Field({ id, label, type = 'text', value, onChange, autoComplete, errors }: FieldProps) {
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={`mt-1 block w-full rounded border bg-surface px-3 py-2 text-ink ${
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
