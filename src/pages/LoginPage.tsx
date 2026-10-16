import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'
import Field from '../components/Field'
import { redirectTarget } from '../redirect'

function banMessage(reason: string): string {
  return `This account is banned. Reason: ${reason}`
}

export default function LoginPage() {
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
  const [error, setError] = useState(stateBanReason === undefined ? '' : banMessage(stateBanReason))
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
        setError(banMessage(err.banReason))
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
      }
      setBusy(false)
    }
  }

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      busyLabel="Logging in..."
      busy={busy}
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          No account yet?{' '}
          <Link to="/register" state={location.state} className="rounded text-accent underline underline-offset-2">
            Register
          </Link>
        </>
      }
    >
      {sessionEnded && (
        <p role="status" className="rounded border border-line bg-accent-soft px-3 py-2 text-sm text-ink">
          Your session has ended. Please log in again.
        </p>
      )}
      <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" errors={fieldErrors.email} />
      <Field
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        errors={fieldErrors.password}
      />
    </AuthForm>
  )
}
