import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'
import Field from '../components/Field'
import { redirectTarget } from '../redirect'

// The reason is written by staff in English; it keeps its own language and direction.
function BanMessage({ reason }: { reason: string }) {
  const { t } = useTranslation()
  return (
    <>
      {t('auth.bannedPrefix')}{' '}
      <span lang="en" dir="auto">
        {reason}
      </span>
    </>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  // Sent here by a request that found the token dead (sessionEnded) or the account banned
  // (banReason). Neither is set after a manual Log out.
  const state = location.state as { banReason?: string; sessionEnded?: boolean } | null
  const stateBanReason = state?.banReason
  const sessionEnded = state?.sessionEnded === true
  const [error, setError] = useState<ReactNode>(stateBanReason === undefined ? '' : <BanMessage reason={stateBanReason} />)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await login(email, password)
      navigate(redirectTarget(location.state), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors)
      } else if (err instanceof ApiError && err.banReason !== undefined) {
        setError(<BanMessage reason={err.banReason} />)
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
      }
      setBusy(false)
    }
  }

  return (
    <AuthForm
      title={t('auth.logInTitle')}
      submitLabel={t('auth.logIn')}
      busyLabel={t('auth.loggingIn')}
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" state={location.state} className="rounded text-accent underline underline-offset-2">
            {t('auth.register')}
          </Link>
        </>
      }
    >
      {sessionEnded && (
        <p role="status" className="rounded border border-line bg-accent-soft px-3 py-2 text-sm text-ink">
          {t('auth.sessionEnded')}
        </p>
      )}
      <Field id="email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" errors={fieldErrors.email} />
      <Field
        id="password"
        label={t('auth.password')}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        errors={fieldErrors.password}
      />
    </AuthForm>
  )
}
