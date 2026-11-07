import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { CONTACT_EMAIL, PRODUCT_NAME } from './site'

// The interface language: English or Arabic. Until the user clicks the language button it
// follows the browser (Arabic when navigator.languages lists Arabic first); after that the
// choice is stored under `lang` and wins. index.html applies the same rules before the first
// paint, so keep the two in step. Strings: src/locales/en.json (source and fallback) and ar.json.
export type AppLanguage = 'en' | 'ar'

// Each language's strings are their own file, so a visitor downloads only the language shown
// (English is not loaded on Arabic pages, so it is no fallback there; check:i18n keeps the keys
// equal). A namespace registers how to load one language (addNamespace); loadStrings adds it to
// i18next once. Switching the language loads every registered namespace first, so no key ever
// shows. The admin area loads English itself (AdminRoute).
type Strings = { default: Record<string, unknown> }
const loaders = new Map<string, (language: AppLanguage) => Promise<Strings>>([
  ['translation', (language) => (language === 'ar' ? import('./locales/ar.json') : import('./locales/en.json'))],
])
const loaded = new Map<string, Promise<void>>()
// The files that have arrived. Not i18next's hasResourceBundle: the admin chunk adds its own English
// strings (pages/admin/bugReportsI18n.ts) and is preloaded for staff, so "en" can exist without en.json.
const ready = new Set<string>()

export function hasStrings(language: AppLanguage, ns = 'translation'): boolean {
  return ready.has(`${language}/${ns}`)
}

export function loadStrings(language: AppLanguage, ns = 'translation'): Promise<void> {
  const key = `${language}/${ns}`
  let done = loaded.get(key)
  if (!done) {
    done = loaders.get(ns)!(language).then(
      (strings) => {
        i18n.addResourceBundle(language, ns, strings.default, true, false)
        ready.add(key)
      },
      (error: unknown) => {
        // A failed download (offline) may be tried again.
        loaded.delete(key)
        throw error
      },
    )
    loaded.set(key, done)
  }
  return done
}

// The language being switched to (setLanguage), or the current one.
let wanted: AppLanguage = 'en'

// A lazy namespace (the visualization strings): its loader, and its strings in the current language,
// and in the one being switched to when a switch is still loading (setLanguage only loads the
// namespaces it knew when it started).
export function addNamespace(ns: string, loader: (language: AppLanguage) => Promise<Strings>): Promise<void> {
  loaders.set(ns, loader)
  return Promise.all([loadStrings(i18n.language as AppLanguage, ns), loadStrings(wanted, ns)]).then(() => {})
}

const KEY = 'lang'

function readLanguage(): AppLanguage {
  // Prerendered pages (scripts/prerender.mjs) are English.
  if (typeof document === 'undefined') return 'en'
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'en' || value === 'ar') return value
  } catch {
    // Storage blocked: follow the browser.
  }
  const first = navigator.languages?.[0] ?? navigator.language ?? ''
  return first.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

// lang and dir on <html> flip the whole layout (Tailwind's logical classes follow dir). The fonts
// (src/index.css) need nothing here: the browser fetches the Arabic file when Arabic text shows.
function applyLanguage(language: string) {
  // No document when the public pages are prerendered in Node (scripts/prerender.mjs).
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

const initial = readLanguage()
wanted = initial

void i18n.use(initReactI18next).init({
  resources: {},
  lng: initial,
  fallbackLng: 'en',
  // {{product}} and {{email}} work in every string (src/site.ts).
  interpolation: { escapeValue: false, defaultVariables: { product: PRODUCT_NAME, email: CONTACT_EMAIL } },
  react: { useSuspense: false },
})
applyLanguage(initial)
i18n.on('languageChanged', applyLanguage)

// The visitor's language: main.tsx (and the prerender) render only once it has arrived. Setting the
// language again then lets i18next see the strings (resolvedLanguage, used by GrowthChart).
export const i18nReady = loadStrings(initial).then(() => i18n.changeLanguage(initial))

// The page keeps the old language until the new one's strings have arrived.
export async function setLanguage(language: AppLanguage) {
  try {
    localStorage.setItem(KEY, language)
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  wanted = language
  await Promise.all([...loaders.keys()].map((ns) => loadStrings(language, ns)))
  await i18n.changeLanguage(language)
}

// Dates and times: Gregorian calendar and Western digits in both languages, never Hijri.
export function formatDateTime(iso: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

// Numbers and percentages in the active language, with Western digits like the rest of the app.
export function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(`${language}-u-nu-latn`).format(value)
}

// ratio from 0 to 1, rounded to a whole percent.
export function formatPercent(ratio: number, language: string): string {
  return new Intl.NumberFormat(`${language}-u-nu-latn`, { style: 'percent', maximumFractionDigits: 0 }).format(ratio)
}

// A calendar date such as "22 October 2026" (Gregorian, Western digits). iso is YYYY-MM-DD.
export function formatDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
}

export default i18n
