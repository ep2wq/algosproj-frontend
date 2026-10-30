import { DirectionProvider } from '@base-ui/react/direction-provider'
import { Suspense, useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import type { User } from '../api'
import { skipLink } from './buttonStyles'
import { CellLoader } from './Loading'
import CookieNotice from './CookieNotice'
import VerifyEmailNotice from './VerifyEmailNotice'
import { setLanguage } from '../i18n'
import { CONTACT_EMAIL, COPYRIGHT_YEAR, PRODUCT_NAME } from '../site'
import { setSoundOn, useSoundOn } from '../sound'
import { toggleTheme, useTheme } from '../theme'

// The current page: ink, medium weight and an accent bar under the word (not colour alone).
const activeMark = 'text-ink font-medium underline decoration-accent decoration-2 underline-offset-[6px]'

// Every header control is 44 px, with any pointer.
const navLink = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded px-2 hover:text-ink lg:px-2.5 ${isActive ? activeMark : 'text-muted'}`

// The buttons inside the settings pill (on paper): 44 px, each one rounded.
const toggleClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-muted hover:bg-surface hover:text-ink'

// A disclosure panel's open state, not role="menu": Escape closes it and returns focus to its button,
// a click outside or focus leaving the wrapper closes it.
function useDisclosure() {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

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

  const onBlur = (event: FocusEvent) => {
    if (event.relatedTarget && !wrapper.current?.contains(event.relatedTarget)) setOpen(false)
  }

  return { open, setOpen, wrapper, button, onBlur }
}

function Chevron({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

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
// says whether sound is on; the icon shows the current state. In the settings pill from lg up. Below
// that the header has no room for it (a phone header would take 3 rows), so it is in the footer with
// its name shown.
function SoundToggle({ className, showLabel = false }: { className: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  const on = useSoundOn()

  return (
    <button
      type="button"
      onClick={() => setSoundOn(!on)}
      aria-pressed={on}
      aria-label={showLabel ? undefined : t('sound.label')}
      className={className}
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

const NAV_PAGES = [
  ['/lessons', 'nav.lessons'],
  ['/challenges', 'nav.challenges'],
  ['/leaderboard', 'nav.leaderboard'],
] as const

const MENU_PAGES = [
  ['/about', 'nav.about'],
  ['/faq', 'nav.faq'],
  ['/contact', 'nav.contact'],
] as const

const menuPanel = 'z-10 mt-1 rounded-lg border border-line bg-surface p-1 shadow-(--float-shadow)'
const menuItem = 'flex min-h-11 w-full items-center rounded px-3 text-start text-muted hover:bg-accent-soft hover:text-ink'

// The last item of the main navigation. From md: "More" with a chevron, holding About, FAQ and
// Contact. Below md the main links leave the header and this becomes the "Menu" button (an icon),
// holding them too. Layout remounts it on every route change (key), so a new page starts with it closed.
function SiteMenu() {
  const { t } = useTranslation()
  const location = useLocation()
  const { open, setOpen, wrapper, button, onBlur } = useDisclosure()
  const panelId = useId()
  // The button shows the current page when that page lives in the menu.
  const current = MENU_PAGES.some(([path]) => location.pathname === path)

  return (
    // Below sm the panel spans the header row (the wrapper is not its containing block there).
    <div ref={wrapper} className="sm:relative" onBlur={onBlur}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`group inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded px-2 hover:text-ink lg:px-2.5 aria-expanded:text-ink ${current ? activeMark : 'text-muted'}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 md:hidden" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="sr-only md:hidden">{t('nav.menu')}</span>
        <span className="max-md:hidden">{t('nav.more')}</span>
        <Chevron className="size-4 max-md:hidden motion-safe:transition-transform group-aria-expanded:rotate-180" />
      </button>
      <div id={panelId} hidden={!open} className={`absolute inset-x-4 top-full sm:inset-x-auto sm:start-0 sm:w-64 ${menuPanel}`}>
        <div className="mb-1 border-b border-line pb-1 md:hidden">
          {NAV_PAGES.map(([path, key]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `${menuItem} ${isActive ? 'font-medium text-ink' : ''}`}>
              {t(key)}
            </NavLink>
          ))}
        </div>
        {MENU_PAGES.map(([path, key]) => (
          <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `${menuItem} ${isActive ? 'font-medium text-ink' : ''}`}>
            {t(key)}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

// The logged-in account: the initial, the name, the points and a chevron in one button. Below lg
// the name is only in the button's accessible name (a 768 px header has no room for it) and the
// chevron goes below md. Its panel repeats name and points, then Admin (staff only) and Log out.
function AccountMenu({ user, staff, bumps, onLogOut }: { user: User; staff: boolean; bumps: number; onLogOut: () => void }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { open, setOpen, wrapper, button, onBlur } = useDisclosure()
  const panelId = useId()
  const points = t('header.points', { count: user.points })
  // Closes when the page changes (a link inside it, or Back).
  const [path, setPath] = useState(location.pathname)
  if (path !== location.pathname) {
    setPath(location.pathname)
    setOpen(false)
  }

  return (
    <div ref={wrapper} className="relative" onBlur={onBlur}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="group inline-flex min-h-11 items-center gap-2 rounded px-1.5 text-sm text-ink hover:bg-paper aria-expanded:bg-paper"
      >
        <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded bg-accent-soft font-bold text-accent">
          {Array.from(user.name.trim())[0]?.toLocaleUpperCase()}
        </span>
        <span dir="auto" className="max-w-40 truncate max-lg:sr-only">
          {user.name}
        </span>
        {/* Pulses once when the points go up (after a passing submit), not on page load: bumps
            remounts it, which replays the motion-safe animation. */}
        <span
          key={bumps}
          className={`inline-block rounded bg-accent-soft px-1.5 py-0.5 whitespace-nowrap text-accent tabular-nums ${bumps > 0 ? 'motion-safe:animate-bump' : ''}`}
        >
          {points}
        </span>
        <Chevron className="size-4 text-muted max-md:hidden motion-safe:transition-transform group-aria-expanded:rotate-180" />
      </button>
      <div id={panelId} hidden={!open} className={`absolute end-0 top-full w-64 max-w-[calc(100vw-2rem)] ${menuPanel}`}>
        <p className="px-3 py-2 text-sm">
          <span dir="auto" className="font-medium break-words text-ink">
            {user.name}
          </span>
          <span className="text-muted">
            {' · '}
            {points}
          </span>
        </p>
        {staff && (
          <Link to="/admin" className={menuItem}>
            {t('nav.admin')}
          </Link>
        )}
        <div className="my-1 border-t border-line" />
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onLogOut()
          }}
          className={menuItem}
        >
          {t('nav.logOut')}
        </button>
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

  // The sticky header blurs what passes under it (.site-header in index.css) once the page has
  // scrolled: one observer on a marker at the top of the page, no scroll listener. The static HTML is
  // the top state, so nothing moves when the app takes over.
  const top = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const marker = top.current
    if (!marker) return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    observer.observe(marker)
    return () => observer.disconnect()
  }, [])

  // The points badge pulses once when the points go up (after a passing submit), not on page load.
  const points = user?.points ?? null
  const [shownPoints, setShownPoints] = useState(points)
  const [bumps, setBumps] = useState(0)
  if (points !== shownPoints) {
    if (points !== null && shownPoints !== null && points > shownPoints) setBumps(bumps + 1)
    setShownPoints(points)
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div ref={top} aria-hidden="true" className="pointer-events-none absolute top-0 h-2 w-px" />
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
      <header data-scrolled={scrolled ? '' : undefined} className="site-header sticky top-0 z-20 border-b">
        {/* Navigation at the start, then settings and the account at the end. On a phone the account
            wraps to a second row at the end. relative: below sm the site menu's panel spans this row. */}
        <div className="site-container relative flex flex-wrap items-center gap-x-2 pt-1 md:py-2 lg:gap-x-3">
          {/* The name is English (and Latin script) in both languages. */}
          <Link to="/" lang="en" className="inline-flex min-h-11 items-center rounded text-lg font-bold tracking-tight text-ink lg:me-2">
            {PRODUCT_NAME}
          </Link>
          <nav aria-label={t('nav.main')} className="flex items-center gap-0.5 text-sm">
            {NAV_PAGES.map(([path, key]) => (
              <NavLink key={path} to={path} className={(state) => `max-md:hidden ${navLink(state)}`}>
                {t(key)}
              </NavLink>
            ))}
            <SiteMenu key={location.pathname} />
          </nav>
          <div className="flex-1" />
          {/* The settings pill. Below md it has no border or inner padding (the buttons stay 44 px), so the
              two-row phone header stays 93 px. */}
          <div role="group" aria-label={t('header.settings')} className="flex items-center gap-0.5 rounded-lg bg-paper text-sm md:border md:border-line md:p-0.5">
            <ThemeToggle />
            <SoundToggle className={`${toggleClass.replace('inline-flex', 'hidden lg:inline-flex')} aria-pressed:text-accent`} />
            <LanguageToggle />
          </div>
          <span aria-hidden="true" className="h-6 w-px bg-line max-lg:hidden" />
          {/* While /me answers, the visitor's buttons hold their place invisibly (most visits are
              visitors, and the static HTML is one): nothing moves when they appear. */}
          {user ? (
            <div className="max-md:ms-auto">
              <AccountMenu user={user} staff={staff} bumps={bumps} onLogOut={() => logout()} />
            </div>
          ) : (
            <div className={`flex items-center gap-2 text-sm max-md:ms-auto ${loading ? 'invisible' : ''}`}>
              {/* Log in outlined, Register the one filled button in the header; the current one is underlined. */}
              <NavLink
                to="/login"
                state={{ from: location }}
                className="inline-flex min-h-11 items-center rounded border border-field bg-surface px-3 font-medium text-ink underline-offset-4 hover:border-muted aria-[current=page]:underline"
              >
                {t('nav.logIn')}
              </NavLink>
              <NavLink
                to="/register"
                state={{ from: location }}
                className="inline-flex min-h-11 items-center rounded bg-accent px-3 font-medium text-inverse underline-offset-4 hover:bg-accent/90 aria-[current=page]:underline"
              >
                {t('nav.register')}
              </NavLink>
            </div>
          )}
        </div>
        <VerifyEmailNotice />
      </header>
      <main id="main" tabIndex={-1} className="site-container flex-1 py-8">
        {/* Base UI (src/components/ui) reads the direction from here, not from dir: arrow keys follow
            the reading order. */}
        <DirectionProvider direction={i18n.dir()}>
          {/* The admin pages (one lazy chunk, src/App.tsx) wait here. This boundary stays mounted,
              so a link to them keeps the current page on screen until the code is ready (the router
              navigates in a transition); only a direct load shows the loader. */}
          <Suspense fallback={<CellLoader label={t('admin.common.loading')} className="min-h-screen items-start pt-20" />}>
            <Outlet context={skipSlot} />
          </Suspense>
        </DirectionProvider>
      </main>
      <Footer />
      <CookieNotice />
    </div>
  )
}

// The tracks link to the lessons page itself: it has an anchor per track (track-<id>) but does not
// scroll to a hash when it opens.
const FOOTER_GROUPS = [
  ['footer.learn', [['/lessons', 'nav.lessons'], ['/challenges', 'nav.challenges'], ['/leaderboard', 'nav.leaderboard']]],
  ['footer.tracks', [['/lessons', 'home.tracks.basics'], ['/lessons', 'home.tracks.data-structures'], ['/lessons', 'home.tracks.algorithms']]],
  ['footer.site', [['/about', 'nav.about'], ['/faq', 'nav.faq'], ['/contact', 'nav.contact']]],
  ['footer.legal', [['/terms', 'nav.terms'], ['/privacy', 'nav.privacy'], ['/cookies', 'nav.cookies']]],
] as const

// On every page, admin included, and in the static HTML. Follows the theme (foot tokens in
// src/index.css): light gray in light mode, near black in dark. Ink headings, muted links that turn
// ink with an underline on hover (the current page too), no accent text. Brand on top, then the four
// link groups (2 x 2 from sm); from lg the brand at the start and the groups in four columns. Below
// lg each group's links wrap in a row and are at least 44 x 44 px.
function Footer() {
  const { t } = useTranslation()
  const footerLink =
    'inline-flex min-h-11 min-w-11 items-center rounded underline-offset-4 hover:text-ink hover:underline lg:pointer-fine:min-h-8 lg:pointer-fine:min-w-0'

  return (
    <footer className="border-t border-foot-line bg-foot pb-(--cookie-h) text-sm text-muted">
      <div className="site-container grid gap-x-8 gap-y-5 pt-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div>
          <p lang="en" className="font-bold text-ink">
            {PRODUCT_NAME}
          </p>
          <p className="mt-1 max-w-xs">{t('footer.mission')}</p>
        </div>
        <nav aria-label={t('footer.label')} className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_GROUPS.map(([heading, links]) => (
            <div key={heading}>
              <h2 className="font-semibold text-ink">{t(heading)}</h2>
              <ul className="mt-1 flex flex-wrap gap-x-5 lg:block">
                {links.map(([path, key]) => (
                  <li key={key}>
                    {heading === 'footer.tracks' ? (
                      <Link to={path} className={footerLink}>
                        {t(key)}
                      </Link>
                    ) : (
                      <NavLink to={path} className={({ isActive }) => `${footerLink} ${isActive ? 'text-ink underline' : ''}`}>
                        {t(key)}
                      </NavLink>
                    )}
                  </li>
                ))}
                {heading === 'footer.site' && (
                  <li>
                    <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className={footerLink}>
                      {CONTACT_EMAIL}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-foot-line py-1 lg:col-span-2">
          <p className="py-2">{t('footer.copyright', { year: COPYRIGHT_YEAR })}</p>
          {/* Below lg the sound switch has no room in the header. */}
          <SoundToggle className="-ms-2 inline-flex min-h-11 items-center rounded px-2 hover:text-ink aria-pressed:text-ink lg:hidden" showLabel />
        </div>
      </div>
    </footer>
  )
}
