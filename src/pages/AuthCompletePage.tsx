import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, getPendingSignIn, SOCIAL_PROVIDER_NAMES, type PendingSignIn } from '../api'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'
import Field from '../components/Field'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingRegion, SkeletonLines } from '../components/Loading'

const button = 'inline-flex min-h-11 items-center justify-center rounded bg-accent px-4 font-medium text-inverse hover:bg-accent/90'

// The second step of a new Google or GitHub account (backend README "Social login"): the API sends
// the browser here after a verified sign-in with an email that has no account yet. The name and
// email come from the session (never the URL); the account is made only once the Terms are accepted.
export default function AuthCompletePage() {
  const { t } = useTranslation()
  const { completeSignIn } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingSignIn | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'expired' | 'error'>('loading')
  // The server's message when loading failed, or null for our generic one.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const messageRef = useRef<HTMLParagraphElement>(null)
  // Set when a submit found the pending sign-in gone, so the message that replaces the form gets focus.
  const goneAfterSubmit = useRef(false)

  useEffect(() => {
    let active = true
    getPendingSignIn()
      .then((result) => {
        if (!active) return
        setPending(result)
        setName(result.name)
        setStatus('ready')
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) {
          setStatus('expired')
        } else {
          setLoadError(err instanceof ApiError ? err.message : null)
          setStatus('error')
        }
      })
    return () => {
      active = false
    }
  }, [attempt])

  // The form was replaced by the message after a submit: move focus to it so it is read out.
  useEffect(() => {
    if (status === 'expired' && goneAfterSubmit.current) messageRef.current?.focus()
  }, [status])

  async function handleSubmit() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await completeSignIn(name)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.fieldErrors)
      } else if (err instanceof ApiError && err.status === 410) {
        // Gone (expired, used, or the email was taken meanwhile): start again from login.
        goneAfterSubmit.current = true
        setStatus('expired')
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
      }
      setBusy(false)
    }
  }

  if (status === 'ready' && pending) {
    return (
      <>
        <meta name="robots" content="noindex" />
        <AuthForm
          title={t('authComplete.title')}
          submitLabel={t('auth.createAccount')}
          busyLabel={t('auth.creatingAccount')}
          busy={busy}
          error={error}
          onSubmit={handleSubmit}
          termsErrors={fieldErrors.accepted_terms}
          footer={
            <Link to="/login" className="rounded text-accent underline underline-offset-2">
              {t('authComplete.cancel')}
            </Link>
          }
        >
          <p className="text-ink">{t('authComplete.intro', { provider: SOCIAL_PROVIDER_NAMES[pending.provider] })}</p>
          <div>
            <p className="text-sm font-medium text-ink">{t('auth.email')}</p>
            <p className="mt-1 break-all text-ink">
              <span dir="ltr">{pending.email}</span>
            </p>
          </div>
          <Field id="name" label={t('auth.name')} value={name} onChange={setName} autoComplete="name" errors={fieldErrors.name} />
        </AuthForm>
      </>
    )
  }

  const title = status === 'expired' ? t('authComplete.expiredTitle') : t('authComplete.title')

  return (
    <div className="mx-auto max-w-sm">
      <title>{t('titles.page', { name: title })}</title>
      <meta name="robots" content="noindex" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      {status === 'loading' && (
        // The form's shape (intro, email, name field, Terms box, button, footer link), so it does not
        // push the footer when it arrives.
        <LoadingRegion label={t('authComplete.loading')} className="mt-6">
          <div className="space-y-4">
            <SkeletonLines lines={3} />
            <div>
              <SkeletonLines lines={1} className="w-1/4 text-sm" />
              <SkeletonLines lines={1} className="mt-1 w-2/3" />
            </div>
            <div>
              <SkeletonLines lines={1} className="w-1/4 text-sm" />
              <Skeleton className="mt-1 h-11" />
            </div>
            <SkeletonLines lines={2} className="py-3 text-sm sm:pointer-fine:py-1" />
            <Skeleton className="h-11" />
          </div>
          <SkeletonLines lines={1} className="mt-4 w-1/2 text-sm" />
        </LoadingRegion>
      )}
      {status === 'expired' && (
        <>
          <p ref={messageRef} tabIndex={-1} className="mt-4 text-ink">
            {t('authComplete.expired')}
          </p>
          <p className="mt-6">
            <Link to="/login" className={button}>
              {t('auth.logIn')}
            </Link>
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <p role="alert" className="mt-4 rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-fail">
            {loadError ?? t('common.genericError')}
          </p>
          <p className="mt-6">
            <button
              type="button"
              onClick={() => {
                setStatus('loading')
                setAttempt((value) => value + 1)
              }}
              className={button}
            >
              {t('common.tryAgain')}
            </button>
          </p>
        </>
      )}
    </div>
  )
}
