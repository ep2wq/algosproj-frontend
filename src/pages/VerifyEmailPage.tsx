import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import ResendVerification from '../components/ResendVerification'

const button = 'inline-flex min-h-11 items-center justify-center rounded bg-accent px-4 font-medium text-inverse hover:bg-accent/90'

// Where the verification link ends (the backend redirects here with ?status=success or invalid).
// The link may open in a browser that is not logged in, so the page works for guests too.
export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const { user, loading, refreshUser } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const success = params.get('status') === 'success'
  const stale = Boolean(user && !user.email_verified)

  // Verified in this browser: update the user, so the notice and the submit gate go away.
  useEffect(() => {
    if (success && stale) refreshUser().catch(() => {})
  }, [success, stale, refreshUser])

  const title = success ? t('verify.successTitle') : t('verify.invalidTitle')

  return (
    <div className="mx-auto max-w-sm">
      <title>{t('titles.page', { name: title })}</title>
      <meta name="robots" content="noindex" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      {success ? (
        <>
          <p className="mt-4 text-ink">{t('verify.success')}</p>
          {!loading && (
            <p className="mt-6">
              <Link to={user ? '/challenges' : '/login'} className={button}>
                {user ? t('verify.toChallenges') : t('auth.logIn')}
              </Link>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-4 text-ink">{t('verify.invalid')}</p>
          {loading ? null : !user ? (
            <>
              <p className="mt-4 text-sm text-muted">{t('verify.logInForNew')}</p>
              <p className="mt-4">
                <Link to="/login" state={{ from: location }} className={button}>
                  {t('auth.logIn')}
                </Link>
              </p>
            </>
          ) : user.email_verified ? (
            <>
              <p className="mt-4 text-sm text-muted">{t('verify.alreadyVerified')}</p>
              <p className="mt-4">
                <Link to="/challenges" className={button}>
                  {t('verify.toChallenges')}
                </Link>
              </p>
            </>
          ) : (
            <ResendVerification className="mt-4" />
          )}
        </>
      )}
    </div>
  )
}
