// Shared by the admin user, audit log and activity pages.

// The admin area is English; local time as 2026-10-20 01:03:42 (the sv-SE format).
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE')
}

// The activity events; each one's label is the key admin.events.<event>.
export const EVENTS = ['register', 'login', 'login_failed', 'login_blocked_banned', 'logout', 'banned_by_admin', 'unbanned']

// Shared class for the filter inputs.
export const controlClass = 'mt-1 block w-full rounded border border-field bg-surface px-3 py-2 text-ink hover:border-muted'
