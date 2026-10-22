import { useSyncExternalStore } from 'react'

// Light or dark. Until the user clicks the theme button the app follows the OS
// (prefers-color-scheme) and updates live when it changes; after the first click the choice is
// stored under `theme` ('light' or 'dark') and wins. Any other stored value, such as the old
// 'system', is ignored. index.html applies the same rules before the first paint, so keep the
// two in step.
const KEY = 'theme'
// No window when the public pages are prerendered in Node (scripts/prerender.mjs): light there.
const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

// Blocked or throwing storage behaves as "follow the OS".
function readStored(): 'light' | 'dark' | null {
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
  return stored === null ? (media?.matches ?? false) : stored === 'dark'
}

// The dark class drives Tailwind's dark: variant and the dark token values in index.css;
// color-scheme makes scrollbars, form controls and the browser UI match.
function apply() {
  const dark = isDark()
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  listeners.forEach((listener) => listener())
}

media?.addEventListener('change', apply)

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

// Whether dark is in effect (for the toggle icon and the Monaco editor theme).
export function useTheme() {
  return { dark: useSyncExternalStore(subscribe, isDark, () => false) }
}
