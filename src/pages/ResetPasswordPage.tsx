import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ApiError, resetPassword } from '../api'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'
import Field from '../components/Field'

// The link from the reset email: /reset-password?token=...&email=... The token and email are read
// once, then taken out of the address bar (history, screenshots, a shared URL), and the page sends
// no referrer. A successful reset ends every session of the account; the user logs in again.
export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [link] = useState(() => {
    const params = new URLSearchParams(location.search)
    return { token: params.get('token') ?? '', email: params.get('email') ?? '' }
  })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // A wrong, expired or used token (or a broken link): only a new link helps.
  const [invalid, setInvalid] = useState(!link.token || !link.email)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const resultRef = useRef<HTMLParagraphElement>(null)
  const submitted = useRef(false)

  useEffect(() => {
    // Keeps the router's own history state; only the address changes.
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  // After a submit the form is replaced by the result: move focus to it so it is read out.
  useEffect(() => {
    if (submitted.current && (done || invalid)) resultRef.current?.focus()
  }, [done, invalid])

  async function handleSubmit() {
    submitted.current = true
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await resetPassword(link.token, link.email, password, confirmation)
      setDone(true)
      // The server ended this browser's session too; forget the user here without a "session ended" detour.
      if (user) logout()
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        if (err.fieldErrors.password) setFieldErrors(err.fieldErrors)
        else setInvalid(true)
      } else if (err instanceof ApiError && err.status === 429) {
        // These limits are per hour, not the minute of the general message.
        setError(t('forgot.tooMany'))
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
      }
    }
    setBusy(false)
  }

  const meta = (
    <>
      <meta name="robots" content="noindex" />
      <meta name="referrer" content="no-referrer" />
    </>
  )

  if (done || invalid) {
    return (
      <div className="mx-auto max-w-sm">
        {meta}
        <title>{t('titles.page', { name: t('reset.title') })}</title>
        <h1 className="text-2xl font-semibold">{t(done ? 'reset.doneTitle' : 'reset.invalidTitle')}</h1>
        <p
          ref={resultRef}
          tabIndex={-1}
          className={`mt-6 rounded-lg border px-3 py-2 ${done ? 'border-line bg-accent-soft text-ink' : 'border-fail/30 bg-fail/5 text-fail'}`}
        >
          {t(done ? 'reset.done' : 'reset.invalid')}
        </p>
        <p className="mt-4">
          <Link
            to={done ? '/login' : '/forgot-password'}
            className="inline-flex min-h-11 items-center justify-center rounded bg-accent px-4 font-medium text-inverse hover:bg-accent/90"
          >
            {t(done ? 'reset.logIn' : 'reset.requestNew')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      {meta}
      <AuthForm
        title={t('reset.title')}
        submitLabel={t('reset.submit')}
        busyLabel={t('reset.saving')}
        busy={busy}
        error={error}
        onSubmit={handleSubmit}
        terms={false}
        footer={
          <Link to="/login" className="inline-flex min-h-11 items-center rounded text-accent underline underline-offset-2 sm:pointer-fine:min-h-6">
            {t('forgot.backToLogin')}
          </Link>
        }
      >
        <p className="text-ink">
          {t('reset.forAccount')}{' '}
          <span dir="ltr" className="break-all font-medium">
            {link.email}
          </span>
        </p>
        <Field
          id="password"
          label={t('reset.newPassword')}
          hint={t('auth.passwordHint')}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          errors={fieldErrors.password}
        />
        <Field
          id="password_confirmation"
          label={t('reset.confirmPassword')}
          type="password"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
          errors={fieldErrors.password_confirmation}
        />
      </AuthForm>
    </>
  )
}
