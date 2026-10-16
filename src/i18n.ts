import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'

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

// lang and dir on <html> flip the whole layout (Tailwind's logical classes follow dir).
function applyLanguage(language: string) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

const initial = readLanguage()

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
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

export default i18n
