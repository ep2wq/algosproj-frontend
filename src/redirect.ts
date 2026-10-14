import type { Location } from 'react-router-dom'

// Where to go after logging in: the page the user came from, or home.
export function redirectTarget(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from
  if (!from || from.pathname === '/login' || from.pathname === '/register') return '/'
  return from.pathname + from.search
}
