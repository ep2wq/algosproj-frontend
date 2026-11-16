import { LANGUAGES, type Language } from './api'

// The last language picked in the problem editor, kept under `code-lang`: the default for the
// editor and for lesson code tabs. Blocked or throwing storage behaves as "nothing stored".
const KEY = 'code-lang'

export function readCodeLang(): Language | null {
  // No window when the public pages are prerendered in Node.
  if (typeof window === 'undefined') return null
  try {
    const value = localStorage.getItem(KEY)
    return LANGUAGES.find((language) => language === value) ?? null
  } catch {
    return null
  }
}

export function saveCodeLang(language: Language) {
  try {
    localStorage.setItem(KEY, language)
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
}
