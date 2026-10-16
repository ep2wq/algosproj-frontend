import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { setLanguage } from '../i18n'
import { toggleTheme, useTheme } from '../theme'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 hover:text-accent ${isActive ? 'text-ink font-medium' : 'text-muted'}`

// 44 px touch targets, like the rest of the header controls on a phone.
const toggleClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-muted hover:text-accent'

// Shows the sun in dark mode and the moon in light mode: the theme a click switches to.
function ThemeToggle() {
  const { t } = useTranslation()
  const { dark } = useTheme()

  return (
    <button type="button" onClick={toggleTheme} aria-label={dark ? t('theme.toLight') : t('theme.toDark')} className={toggleClass}>
      {dark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      )}
    </button>
  )
}

// Shows the name of the other language, in that language. The hidden hint says what the button
// does, in the current language, so the accessible name contains the visible label.
function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const arabic = i18n.language === 'ar'

  return (
    <button type="button" onClick={() => setLanguage(arabic ? 'en' : 'ar')} className={toggleClass}>
      <span lang={arabic ? 'en' : 'ar'}>{arabic ? 'English' : 'العربية'}</span>
      <span className="sr-only"> {t('language.hint')}</span>
    </button>
  )
}

export default function Layout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          {/* The name is English (and Latin script) in both languages. */}
          <Link to="/" lang="en" className="rounded text-lg font-semibold tracking-tight text-ink">
            AlgosProj
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            <NavLink to="/" end className={navLink}>
              Lessons
            </NavLink>
            <NavLink to="/challenges" className={navLink}>
              Challenges
            </NavLink>
            <NavLink to="/leaderboard" className={navLink}>
              Leaderboard
            </NavLink>
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <NavLink to="/admin" className={navLink}>
                Admin
              </NavLink>
            )}
          </nav>
          {/* Wraps on narrow screens, so the theme control never pushes the page sideways. */}
          <div className="ms-auto flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center">
              <ThemeToggle />
              <LanguageToggle />
            </div>
            {loading ? null : user ? (
              <>
                <span className="text-ink">
                  <span dir="auto">{user.name}</span>{' '}
                  <span className="ms-1 rounded bg-accent-soft px-1.5 py-0.5 text-accent tabular-nums">
                    {user.points} {user.points === 1 ? 'point' : 'points'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded px-2 py-1 text-muted hover:text-accent"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  state={{ from: location }}
                  className="rounded px-2 py-1 text-muted hover:text-accent"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  state={{ from: location }}
                  className="rounded border border-accent px-3 py-1 text-accent hover:bg-accent-soft"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
