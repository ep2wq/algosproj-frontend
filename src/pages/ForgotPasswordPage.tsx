import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, forgotPassword } from '../api'
import AuthForm from '../components/AuthForm'
import Field from '../components/Field'

// Asks for a reset link. The answer is the same whether or not the account exists (the backend
// sends the email only for a real account), so the page never says which it was.
export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const sentRef = useRef<HTMLParagraphElement>(null)

  // The form is replaced by the confirmation: move focus to it so it is read out.
  useEffect(() => {
    if (sent) sentRef.current?.focus()
  }, [sent])

  async function handleSubmit() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors)
      } else if (err instanceof ApiError && err.status === 429) {
        // These limits are per hour, not the minute of the general message.
        setError(t('forgot.tooMany'))
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
      }
    }
    setBusy(false)
  }

  const backToLogin = (
    <Link to="/login" className="inline-flex min-h-11 items-center rounded text-accent underline underline-offset-2 sm:pointer-fine:min-h-6">
      {t('forgot.backToLogin')}
    </Link>
  )

  if (sent) {
    return (
      <div className="mx-auto max-w-sm">
        <title>{t('titles.page', { name: t('forgot.title') })}</title>
        <meta name="robots" content="noindex" />
        <h1 className="text-2xl font-semibold">{t('forgot.title')}</h1>
        <p ref={sentRef} tabIndex={-1} className="mt-6 rounded-lg border border-line bg-accent-soft px-3 py-2 text-ink">
          {t('forgot.sent')}
        </p>
        <p className="mt-4 text-sm text-muted">{t('forgot.sentHint')}</p>
        <p className="mt-4 text-sm">{backToLogin}</p>
      </div>
    )
  }

  return (
    <>
      <meta name="robots" content="noindex" />
      <AuthForm
        title={t('forgot.title')}
        submitLabel={t('forgot.submit')}
        busyLabel={t('forgot.sending')}
        busy={busy}
        error={error}
        onSubmit={handleSubmit}
        terms={false}
        footer={backToLogin}
      >
        <p className="text-ink">{t('forgot.intro')}</p>
        <Field id="email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" errors={fieldErrors.email} />
      </AuthForm>
    </>
  )
}
