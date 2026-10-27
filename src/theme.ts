import { useSyncExternalStore } from 'react'

// Light or dark. Dark until the user clicks the theme button; after that the choice is stored
// under `theme` ('light' or 'dark') and wins. There is no "follow the OS" setting: any other stored
// value, such as the old 'system', is ignored. index.html applies the same rules before the first
// paint (and the prerendered HTML is dark), so keep the two in step.
const KEY = 'theme'
const listeners = new Set<() => void>()

// Blocked or throwing storage behaves as "no choice yet" (dark).
function readStored(): 'light' | 'dark' | null {
  // No window when the public pages are prerendered in Node (scripts/prerender.mjs).
  if (typeof window === 'undefined') return null
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Storage blocked.
  }
  return null
}

let stored = readStored()

function isDark(): boolean {
  return stored !== 'light'
}

// The dark class drives Tailwind's dark: variant and the dark token values in index.css;
// color-scheme makes scrollbars, form controls and the browser UI match; theme-color is the
// browser bar (--color-surface).
function apply() {
  const dark = isDark()
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#ffffff')
  listeners.forEach((listener) => listener())
}

export function toggleTheme() {
  stored = isDark() ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, stored)
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

// Whether dark is in effect (for the toggle icon and the Monaco editor theme). The prerendered HTML
// is dark.
export function useTheme() {
  return { dark: useSyncExternalStore(subscribe, isDark, () => true) }
}
