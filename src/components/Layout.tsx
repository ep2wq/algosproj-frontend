import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { setLanguage } from '../i18n'
import { toggleTheme, useTheme } from '../theme'

// Taller on a phone, where they are tapped, and narrower so the logo and links share a row at 360 px.
const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded px-1 py-2 sm:px-2 sm:py-1 hover:text-accent ${isActive ? 'text-ink font-medium' : 'text-muted'}`

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

// Phones only: a disclosure button whose panel holds the full name, the Admin link (staff) and
// Log out, so the header stays at 2 rows. Escape, a click outside, or focus leaving it closes it.
// Layout remounts it on every route change (key), so a new page always starts with it closed.
function AccountMenu({ name, staff, onLogOut }: { name: string; staff: boolean; onLogOut: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const item = 'flex min-h-11 w-full items-center rounded px-3 text-start text-muted hover:bg-accent-soft hover:text-accent'

  return (
    <div
      ref={wrapper}
      className="relative sm:hidden"
      onBlur={(event) => {
        if (event.relatedTarget && !wrapper.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t('nav.account')}
        onClick={() => setOpen(!open)}
        className={`${toggleClass} aria-expanded:text-accent`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute end-0 top-full z-10 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-1 shadow-float"
      >
        <p dir="auto" className="break-words px-3 py-2 font-medium text-ink">
          {name}
        </p>
        {staff && (
          <Link to="/admin" onClick={() => setOpen(false)} className={item}>
            {t('nav.admin')}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onLogOut()
          }}
          className={item}
        >
          {t('nav.logOut')}
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const { t } = useTranslation()
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const staff = user?.role === 'admin' || user?.role === 'owner'

  return (
    <div className="min-h-screen">
      {/* Focuses <main> itself: following #main would push a history entry and drop location.state. */}
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-10 focus:rounded focus:border focus:border-accent focus:bg-surface focus:px-3 focus:py-2 focus:text-accent focus:shadow-float"
      >
        {t('nav.skipToContent')}
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:gap-x-4 sm:py-3">
          {/* The name is English (and Latin script) in both languages. */}
          <Link to="/" lang="en" className="rounded text-lg font-semibold tracking-tight text-ink">
            AlgosProj
          </Link>
          <nav aria-label={t('nav.main')} className="flex flex-wrap items-center gap-1 text-sm">
            <NavLink to="/" end className={navLink}>
              {t('nav.lessons')}
            </NavLink>
            <NavLink to="/challenges" className={navLink}>
              {t('nav.challenges')}
            </NavLink>
            <NavLink to="/leaderboard" className={navLink}>
              {t('nav.leaderboard')}
            </NavLink>
            {/* On a phone Admin is in the account menu instead. */}
            {staff && (
              <NavLink to="/admin" className={(state) => `hidden sm:block ${navLink(state)}`}>
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>
          {/* Wraps on narrow screens, so the toggles never push the page sideways. On a phone the
              name and Log out move into the account menu, next to the points. */}
          <div className="ms-auto flex flex-wrap items-center gap-2 text-sm sm:gap-3">
            <div className="flex items-center">
              <ThemeToggle />
              <LanguageToggle />
            </div>
            {loading ? null : user ? (
              <>
                <span className="text-ink">
                  <span dir="auto" className="hidden sm:inline">
                    {user.name}
                  </span>{' '}
                  <span className="rounded sm:ms-1 bg-accent-soft px-1.5 py-0.5 text-accent tabular-nums">
                    {t('header.points', { count: user.points })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="hidden rounded px-2 py-1 text-muted hover:text-accent sm:block"
                >
                  {t('nav.logOut')}
                </button>
                <AccountMenu key={location.pathname} name={user.name} staff={staff} onLogOut={() => logout()} />
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  state={{ from: location }}
                  className={({ isActive }) =>
                    `rounded px-2 py-1 hover:text-accent ${isActive ? 'font-medium text-ink' : 'text-muted'}`
                  }
                >
                  {t('nav.logIn')}
                </NavLink>
                <NavLink
                  to="/register"
                  state={{ from: location }}
                  className={({ isActive }) =>
                    `rounded border border-accent px-3 py-1 text-accent hover:bg-accent-soft ${isActive ? 'bg-accent-soft font-medium' : ''}`
                  }
                >
                  {t('nav.register')}
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 focus:outline-none">
        <Outlet />
      </main>
    </div>
  )
}
