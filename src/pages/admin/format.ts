import { formatDateTime } from '../../i18n'

// Shared by the admin user, audit log and activity pages.

// The admin area is English; Gregorian dates with Western digits, as everywhere.
export function formatTime(iso: string): string {
  return formatDateTime(iso, 'en')
}

// The activity events; each one's label is the key admin.events.<event>.
export const EVENTS = ['register', 'login', 'login_failed', 'login_blocked_banned', 'logout', 'banned_by_admin', 'unbanned']

// Shared class for the filter inputs.
export const controlClass = 'mt-1 block w-full rounded border border-field bg-surface px-3 py-2 text-ink hover:border-muted'
