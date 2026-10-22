import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'
import { CONTACT_EMAIL, PRODUCT_NAME } from './site'

// The interface language: English or Arabic. Until the user clicks the language button it
// follows the browser (Arabic when navigator.languages lists Arabic first); after that the
// choice is stored under `lang` and wins. index.html applies the same rules before the first
// paint, so keep the two in step. Strings: src/locales/en.json (source and fallback) and ar.json.
export type AppLanguage = 'en' | 'ar'

const KEY = 'lang'

function readLanguage(): AppLanguage {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'en' || value === 'ar') return value
  } catch {
    // Storage blocked: follow the browser.
  }
  const first = navigator.languages?.[0] ?? navigator.language ?? ''
  return first.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

// lang and dir on <html> flip the whole layout (Tailwind's logical classes follow dir). The
// Arabic font is fetched only once Arabic is used, so English pages load exactly as before.
function applyLanguage(language: string) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  if (language === 'ar') void import('@fontsource-variable/noto-sans-arabic/wght.css')
}

const initial = readLanguage()

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initial,
  fallbackLng: 'en',
  // {{product}} and {{email}} work in every string (src/site.ts).
  interpolation: { escapeValue: false, defaultVariables: { product: PRODUCT_NAME, email: CONTACT_EMAIL } },
  react: { useSuspense: false },
})
applyLanguage(initial)
i18n.on('languageChanged', applyLanguage)

export function setLanguage(language: AppLanguage) {
  try {
    localStorage.setItem(KEY, language)
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  void i18n.changeLanguage(language)
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
