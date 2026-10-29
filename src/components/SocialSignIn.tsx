import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { socialSignInUrl } from '../api'
// Google's standard "G" from its Sign in with Google branding assets (signin-assets.zip, the
// icon-only light button), cut to the logo: the button's own fill and border were removed and the
// view box cropped to the 20 px logo. Its colours and proportions must not change; it scales with the
// text (size-5), like the rest of the button.
import googleG from '../assets/google-g.svg'

// GitHub's mark: Octicons "mark-github" 24 (MIT, github.com/primer/octicons), in the text colour.
function GithubMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0">
      <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943" />
    </svg>
  )
}

// Google's button colours (tokens social-*), the same for both so neither is more prominent.
const button =
  'flex min-h-11 w-full items-center justify-center gap-3 rounded border border-social-line bg-social px-4 py-2 text-center font-medium text-social-ink hover:border-social-ink'

// "Continue with Google / GitHub" under the login and register forms. Real links (a full page visit
// to the API), but only once the Terms box is checked: otherwise the click goes nowhere and onRefused
// shows the box's error and focuses it, like the form's own submit.
export default function SocialSignIn({ accepted, onRefused }: { accepted: boolean; onRefused: () => void }) {
  const { t } = useTranslation()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (accepted) return
    event.preventDefault()
    onRefused()
  }

  return (
    <div className="mt-6">
      <p className="flex items-center gap-3 text-sm text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        {t('auth.or')}
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </p>
      <div className="mt-6 space-y-3">
        <a href={socialSignInUrl('google')} onClick={handleClick} className={button}>
          <img src={googleG} alt="" width={20} height={20} className="size-5 shrink-0" />
          {t('auth.continueWithGoogle')}
        </a>
        <a href={socialSignInUrl('github')} onClick={handleClick} className={button}>
          <GithubMark />
          {t('auth.continueWithGithub')}
        </a>
      </div>
    </div>
  )
}
