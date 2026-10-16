import { useSyncExternalStore } from 'react'

// The theme: "system" (default) follows the OS, "light" and "dark" are fixed. The choice is the
// only thing besides the token kept in localStorage. index.html applies it before the first paint
// with the same rules, so keep the two in step.
export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

// Blocked or throwing storage behaves as "system".
function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Storage blocked.
  }
  return 'system'
}

let choice = readChoice()

function isDark(): boolean {
  return choice === 'dark' || (choice === 'system' && media.matches)
}

// The dark class drives Tailwind's dark: variant and the dark token values in index.css;
// color-scheme makes scrollbars, form controls and the browser UI match.
function apply() {
  const dark = isDark()
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  listeners.forEach((listener) => listener())
}

// The OS setting can change while the page is open; "system" follows it live.
media.addEventListener('change', apply)

export function setThemeChoice(next: ThemeChoice) {
  choice = next
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// The current choice and whether dark is in effect (for the Monaco editor theme).
export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => choice)
  const dark = useSyncExternalStore(subscribe, isDark)
  return { choice: current, dark }
}
