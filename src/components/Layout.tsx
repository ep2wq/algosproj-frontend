import { DirectionProvider } from '@base-ui/react/direction-provider'
import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { skipLink } from './buttonStyles'
import { setLanguage } from '../i18n'
import { PRODUCT_NAME } from '../site'
import { setSoundOn, useSoundOn } from '../sound'
import { toggleTheme, useTheme } from '../theme'

// The current page: ink, medium weight and an accent bar under the word (not colour alone).
const activeMark = 'text-ink font-medium underline decoration-accent decoration-2 underline-offset-[6px]'

// Taller on a phone, where they are tapped, and narrower so the logo and links share a row at 360 px.
const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded px-1 py-2 sm:px-2 sm:py-1 hover:text-accent ${isActive ? activeMark : 'text-muted'}`

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

// Sound effects, off until switched on. A toggle button: the name stays the same and aria-pressed
// says whether sound is on; the icon shows the current state. Next to the theme and language buttons
// from lg up. Below that the header has no room for it (logged-out Arabic would take 3 rows on a phone,
// a logged-in header 2 rows at 768 px), so it is in the footer with its name shown.
function SoundToggle({ className = toggleClass, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  const on = useSoundOn()

  return (
    <button
      type="button"
      onClick={() => setSoundOn(!on)}
      aria-pressed={on}
      aria-label={showLabel ? undefined : t('sound.label')}
      className={`${className} aria-pressed:text-accent`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
      </svg>
      {showLabel && <span className="ms-2">{t('sound.label')}</span>}
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

// The site menu: About, FAQ and Contact at every width (the header has no room for three more
// links next to a logged-in name). Below lg it also holds the full name and Log out, and on a phone
// Admin (or, for a visitor, Log in; Register stays in the header), so a phone header stays at 2
// rows and a tablet header at 1. A disclosure, not role="menu". Escape, a click outside, or focus leaving
// it closes it. Layout remounts it on every route change (key), so a new page starts with it closed.
const MENU_PAGES = [
  ['/about', 'nav.about'],
  ['/faq', 'nav.faq'],
  ['/contact', 'nav.contact'],
] as const

function SiteMenu({ name, guest, staff, onLogOut }: { name: string | null; guest: boolean; staff: boolean; onLogOut: () => void }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  // The button shows the current page when that page lives in the menu.
  const current = MENU_PAGES.some(([path]) => location.pathname === path)

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
      className="relative"
      onBlur={(event) => {
        if (event.relatedTarget && !wrapper.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      {/* Icon only below lg, icon and word from lg; the name is always the word. */}
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`${toggleClass} gap-1.5 aria-expanded:text-accent ${current ? activeMark : ''}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 lg:size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="sr-only lg:not-sr-only">{t('nav.more')}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute end-0 top-full z-10 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-1 shadow-(--float-shadow)"
      >
        {name !== null && (
          <p dir="auto" className="break-words px-3 py-2 font-medium text-ink lg:hidden">
            {name}
          </p>
        )}
        {MENU_PAGES.map(([path, key]) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `${item} ${isActive ? 'font-medium text-ink' : ''}`}
          >
            {t(key)}
          </NavLink>
        ))}
        {name !== null && (
          <div className="mt-1 border-t border-line pt-1 lg:hidden">
            {staff && (
              <Link to="/admin" onClick={() => setOpen(false)} className={`${item} sm:hidden`}>
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
        )}
        {guest && (
          <div className="mt-1 border-t border-line pt-1 sm:hidden">
            <Link to="/login" state={{ from: location }} onClick={() => setOpen(false)} className={item}>
              {t('nav.logIn')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const staff = user?.role === 'admin' || user?.role === 'owner'

  // Where a page renders its own skip link (passed to pages as the outlet context).
  const [skipSlot, setSkipSlot] = useState<HTMLDivElement | null>(null)

  // The points badge pulses once when the points go up (after a passing submit), not on page load.
  // bumps remounts the badge, which replays the motion-safe animation.
  const points = user?.points ?? null
  const [shownPoints, setShownPoints] = useState(points)
  const [bumps, setBumps] = useState(0)
  if (points !== shownPoints) {
    if (points !== null && shownPoints !== null && points > shownPoints) setBumps(bumps + 1)
    setShownPoints(points)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Focuses <main> itself: following #main would push a history entry and drop location.state. */}
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className={skipLink}
      >
        {t('nav.skipToContent')}
      </a>
      {/* A page can add its own skip link here, right after this one (LessonPage: Skip to challenge). */}
      <div ref={setSkipSlot} />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:gap-x-4 sm:py-3">
          {/* The name is English (and Latin script) in both languages. */}
          <Link to="/" lang="en" className="rounded text-lg font-semibold tracking-tight text-ink">
            {PRODUCT_NAME}
          </Link>
          <nav aria-label={t('nav.main')} className="flex flex-wrap items-center gap-1 text-sm">
            <NavLink to="/lessons" className={navLink}>
              {t('nav.lessons')}
            </NavLink>
            <NavLink to="/challenges" className={navLink}>
              {t('nav.challenges')}
            </NavLink>
            <NavLink to="/leaderboard" className={navLink}>
              {t('nav.leaderboard')}
            </NavLink>
            {/* On a phone Admin is in the site menu instead. */}
            {staff && (
              <NavLink to="/admin" className={(state) => `hidden sm:block ${navLink(state)}`}>
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>
          {/* Wraps on narrow screens, so the toggles never push the page sideways. Below lg the
              name and Log out move into the site menu, next to the points. */}
          <div className="ms-auto flex flex-wrap items-center gap-2 text-sm sm:gap-3">
            <div className="flex items-center">
              <ThemeToggle />
              <SoundToggle className={toggleClass.replace('inline-flex', 'hidden lg:inline-flex')} />
              <LanguageToggle />
              <SiteMenu
                key={location.pathname}
                name={loading ? null : (user?.name ?? null)}
                guest={!loading && !user}
                staff={staff}
                onLogOut={() => logout()}
              />
            </div>
            {loading ? null : user ? (
              <>
                <span className="text-ink">
                  <span dir="auto" className="hidden lg:inline">
                    {user.name}
                  </span>{' '}
                  <span
                    key={bumps}
                    className={`inline-block rounded lg:ms-1 bg-accent-soft px-1.5 py-0.5 text-accent tabular-nums ${bumps > 0 ? 'motion-safe:animate-bump' : ''}`}
                  >
                    {t('header.points', { count: user.points })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="hidden rounded px-2 py-1 text-muted hover:text-accent lg:block"
                >
                  {t('nav.logOut')}
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  state={{ from: location }}
                  className={({ isActive }) =>
                    `hidden rounded px-2 py-1 hover:text-accent sm:block ${isActive ? 'font-medium text-ink' : 'text-muted'}`
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
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none">
        {/* Base UI (src/components/ui) reads the direction from here, not from dir: arrow keys follow
            the reading order. */}
        <DirectionProvider direction={i18n.dir()}>
          <Outlet context={skipSlot} />
        </DirectionProvider>
      </main>
      <Footer language={i18n.language} />
    </div>
  )
}

const FOOTER_GROUPS = [
  ['footer.learn', [['/lessons', 'nav.lessons'], ['/challenges', 'nav.challenges'], ['/leaderboard', 'nav.leaderboard']]],
  ['footer.site', [['/about', 'nav.about'], ['/faq', 'nav.faq'], ['/contact', 'nav.contact']]],
  ['footer.legal', [['/terms', 'nav.terms'], ['/privacy', 'nav.privacy'], ['/cookies', 'nav.cookies']]],
] as const

// When the page was opened: the copyright year comes from it.
const opened = new Date()

// On every page, admin included. The year is computed, in the page language.
function Footer({ language }: { language: string }) {
  const { t } = useTranslation()
  const year = new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, { year: 'numeric' }).format(opened)
  const footerLink = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center rounded sm:min-h-8 hover:text-accent ${isActive ? activeMark : 'text-muted'}`

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-5xl gap-x-8 gap-y-6 px-4 pt-8 pb-4 sm:grid-cols-[1fr_auto]">
        <div className="max-w-xs">
          <p lang="en" className="text-lg font-semibold tracking-tight text-ink">
            {PRODUCT_NAME}
          </p>
          <p className="mt-1 text-sm text-muted">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.label')} className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm min-[420px]:grid-cols-3">
          {FOOTER_GROUPS.map(([heading, links]) => (
            <div key={heading}>
              <h2 className="text-sm font-semibold text-ink">{t(heading)}</h2>
              <ul className="mt-1">
                {links.map(([path, key]) => (
                  <li key={path}>
                    <NavLink to={path} className={footerLink}>
                      {t(key)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-muted sm:col-span-2">
          <p>{t('footer.copyright', { year })}</p>
          {/* Below lg the sound switch has no room in the header. */}
          <SoundToggle className="-ms-2 inline-flex min-h-11 items-center rounded px-2 text-sm text-muted hover:text-accent lg:hidden" showLabel />
        </div>
      </div>
    </footer>
  )
}
