import { DirectionProvider } from '@base-ui/react/direction-provider'
import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { skipLink } from './buttonStyles'
import { setLanguage } from '../i18n'
import { CONTACT_EMAIL, COPYRIGHT_YEAR, PRODUCT_NAME } from '../site'
import { setSoundOn, useSoundOn } from '../sound'
import { toggleTheme, useTheme } from '../theme'

// The current page: ink, medium weight and an accent bar under the word (not colour alone).
const activeMark = 'text-ink font-medium underline decoration-accent decoration-2 underline-offset-[6px]'

// Below sm the three links share the second header row, 44 px tall; from sm they sit next to the logo,
// 36 px with a mouse (44 on a touch screen at any width, such as a phone on its side).
const navLink = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 grow items-center justify-center rounded px-2 hover:text-accent sm:grow-0 sm:pointer-fine:min-h-9 ${isActive ? activeMark : 'text-muted'}`

// 44 px touch targets, like the rest of the header controls on a phone.
const toggleClass = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 text-muted hover:text-accent'

// Shows the sun in dark mode and the moon in light mode: the theme a click switches to. In the header
// from sm; below that it is a labelled item in the site menu.
function ThemeToggle({ className = toggleClass, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const label = dark ? t('theme.toLight') : t('theme.toDark')

  return (
    <button type="button" onClick={toggleTheme} aria-label={showLabel ? undefined : label} className={className}>
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
      {showLabel && <span className="ms-2">{label}</span>}
    </button>
  )
}

// Sound effects, off until switched on. A toggle button: the name stays the same and aria-pressed
// says whether sound is on; the icon shows the current state. Next to the theme and language buttons
// from lg up. Below that the header has no room for it (logged-out Arabic would take 3 rows on a phone,
// a logged-in header 2 rows at 768 px), so it is in the footer with its name shown.
function SoundToggle({ className = `${toggleClass} aria-pressed:text-accent`, showLabel = false }: { className?: string; showLabel?: boolean }) {
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

// The site menu: About, FAQ and Contact at every width (the header has no room for three more
// links next to a logged-in name). Below lg it also holds the full name and Log out, and on a phone
// the theme button and Admin (or, for a visitor, Log in; Register stays in the header), so a phone
// header stays at 2 rows (controls, then the three links) and a tablet header at 1. A disclosure,
// not role="menu". Escape, a click outside, or focus leaving
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
      className="sm:relative"
      onBlur={(event) => {
        if (event.relatedTarget && !wrapper.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      {/* Icon only below lg, icon and word from lg; the name is always the word. Below sm the panel
          below spans the header row (the wrapper is not its containing block there). */}
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
        className="absolute inset-x-4 top-full z-10 mt-1 rounded-lg border border-line bg-surface p-1 shadow-(--float-shadow) sm:inset-x-auto sm:end-0 sm:w-64"
      >
        {/* Below sm the header has no room for the theme button. */}
        <ThemeToggle className={`${item} sm:hidden`} showLabel />
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

  // The sticky header turns to frosted glass (.site-header in index.css) once the page has scrolled:
  // one observer on a marker at the top of the page, no scroll listener. The static HTML is the top
  // state, so nothing moves when the app takes over.
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
  // bumps remounts the badge, which replays the motion-safe animation.
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
        {/* relative: below sm the site menu's panel spans this row, not its button. */}
        <div className="relative mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 px-4 pt-1 sm:gap-x-4 sm:py-3">
          {/* The name is English (and Latin script) in both languages. */}
          <Link to="/" lang="en" className="inline-flex min-h-11 items-center rounded text-lg font-bold tracking-tight text-ink">
            {PRODUCT_NAME}
          </Link>
          {/* Below sm: its own row under the controls, the links sharing its width (with very large
              text they wrap instead of overlapping). */}
          <nav
            aria-label={t('nav.main')}
            className="order-last -mx-2 flex w-[calc(100%+1rem)] flex-wrap text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-nowrap sm:gap-1"
          >
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
              <NavLink to="/admin" className={(state) => `max-sm:hidden ${navLink(state)}`}>
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>
          {/* Wraps on narrow screens, so the toggles never push the page sideways. Below lg the
              name and Log out move into the site menu, next to the points. */}
          <div className="ms-auto flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-3">
            <div className="flex items-center">
              <ThemeToggle className={toggleClass.replace('inline-flex', 'hidden sm:inline-flex')} />
              <SoundToggle className={`${toggleClass.replace('inline-flex', 'hidden lg:inline-flex')} aria-pressed:text-accent`} />
              <LanguageToggle />
              <SiteMenu
                key={location.pathname}
                name={loading ? null : (user?.name ?? null)}
                guest={!loading && !user}
                staff={staff}
                onLogOut={() => logout()}
              />
            </div>
            {/* While /me answers, the visitor's links hold their place invisibly (most visits are
                visitors, and the static HTML is one): nothing moves when they appear. */}
            {user ? (
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
                  className="hidden min-h-11 items-center rounded px-2 text-muted hover:text-accent lg:inline-flex pointer-fine:min-h-9"
                >
                  {t('nav.logOut')}
                </button>
              </>
            ) : (
              <div className={`flex flex-wrap items-center justify-end gap-1 sm:gap-3 ${loading ? 'invisible' : ''}`}>
                <NavLink
                  to="/login"
                  state={{ from: location }}
                  className={({ isActive }) =>
                    `hidden min-h-11 items-center rounded px-2 hover:text-accent sm:inline-flex pointer-fine:min-h-9 ${isActive ? activeMark : 'text-muted'}`
                  }
                >
                  {t('nav.logIn')}
                </NavLink>
                <NavLink
                  to="/register"
                  state={{ from: location }}
                  className={({ isActive }) =>
                    `inline-flex min-h-11 items-center rounded border border-accent px-3 font-medium text-accent hover:bg-accent-soft motion-safe:active:translate-y-px sm:pointer-fine:min-h-9 ${isActive ? 'bg-accent-soft' : ''}`
                  }
                >
                  {t('nav.register')}
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/* Base UI (src/components/ui) reads the direction from here, not from dir: arrow keys follow
            the reading order. */}
        <DirectionProvider direction={i18n.dir()}>
          <Outlet context={skipSlot} />
        </DirectionProvider>
      </main>
      <Footer />
    </div>
  )
}

const FOOTER_GROUPS = [
  ['footer.learn', [['/lessons', 'nav.lessons'], ['/challenges', 'nav.challenges'], ['/leaderboard', 'nav.leaderboard']]],
  ['footer.site', [['/about', 'nav.about'], ['/faq', 'nav.faq'], ['/contact', 'nav.contact']]],
  ['footer.legal', [['/terms', 'nav.terms'], ['/privacy', 'nav.privacy'], ['/cookies', 'nav.cookies']]],
] as const

// On every page, admin included, and in the static HTML. Dark in both themes (footer-* tokens in
// src/index.css), compact, Latin and numbers in JetBrains Mono (Arabic falls through to Plex Sans
// Arabic in the same stack). Brand and the three link groups: 4 columns from lg, 2 x 2 from sm (the
// nav is a subgrid, so it stays one landmark; its first cell is left to the brand), one column below.
// Below lg each group's links wrap in a row and are 44 px tall. Hover and the current page add an
// underline, not only a colour.
function Footer() {
  const { t } = useTranslation()
  const footerLink =
    'inline-flex min-h-11 items-center rounded underline-offset-4 decoration-footer-accent hover:text-footer-accent hover:underline lg:pointer-fine:min-h-7'

  return (
    <footer className="border-t border-footer-line bg-footer font-mono text-xs text-footer-muted">
      <div className="mx-auto grid max-w-5xl gap-x-8 gap-y-6 px-4 pt-8 pb-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        {/* relative: painted above the nav, whose subgrid also covers this cell from sm to lg. */}
        <div className="relative sm:col-start-1 sm:row-start-1">
          <p lang="en" className="text-sm font-bold text-footer-ink">
            {PRODUCT_NAME}
          </p>
          <p className="mt-2 max-w-xs leading-5">{t('footer.mission')}</p>
        </div>
        <nav
          aria-label={t('footer.label')}
          className="grid gap-y-6 sm:col-span-2 sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:grid-cols-subgrid sm:grid-rows-subgrid lg:col-span-3 lg:col-start-2 lg:row-span-1"
        >
          {FOOTER_GROUPS.map(([heading, links], index) => (
            <div key={heading} className={index === 0 ? 'sm:col-start-2 lg:col-start-1' : ''}>
              <h2 className="text-xs font-bold text-footer-ink">{t(heading)}</h2>
              <ul className="mt-1 flex flex-wrap gap-x-5 lg:mt-2 lg:block">
                {links.map(([path, key]) => (
                  <li key={path}>
                    <NavLink
                      to={path}
                      className={({ isActive }) => `${footerLink} ${isActive ? 'text-footer-ink underline' : ''}`}
                    >
                      {t(key)}
                    </NavLink>
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 pt-2 sm:col-span-2 lg:col-span-4">
          <p className="py-2">{t('footer.copyright', { year: COPYRIGHT_YEAR })}</p>
          {/* Below lg the sound switch has no room in the header. */}
          <SoundToggle
            className="-ms-2 inline-flex min-h-11 items-center rounded px-2 hover:text-footer-accent aria-pressed:text-footer-accent lg:hidden"
            showLabel
          />
        </div>
      </div>
    </footer>
  )
}
