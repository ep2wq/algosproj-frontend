import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'
import Field from '../components/Field'
import { redirectTarget } from '../redirect'

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await register(name, email, password)
      navigate(redirectTarget(location.state), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors)
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
      }
      setBusy(false)
    }
  }

  return (
    <AuthForm
      title={t('auth.registerTitle')}
      submitLabel={t('auth.createAccount')}
      busyLabel={t('auth.creatingAccount')}
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      termsErrors={fieldErrors.accepted_terms}
      social
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" state={location.state} className="rounded text-accent underline underline-offset-2">
            {t('auth.logIn')}
          </Link>
        </>
      }
    >
      <Field id="name" label={t('auth.name')} value={name} onChange={setName} autoComplete="name" errors={fieldErrors.name} />
      <Field id="email" label={t('auth.email')} type="email" value={email} onChange={setEmail} autoComplete="email" errors={fieldErrors.email} />
      <Field
        id="password"
        label={t('auth.password')}
        hint={t('auth.passwordHint')}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        errors={fieldErrors.password}
      />
    </AuthForm>
  )
}
