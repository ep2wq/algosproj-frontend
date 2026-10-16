// Shared by the admin user, audit log and activity pages.

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

export const EVENT_LABELS: Record<string, string> = {
  register: 'Registered',
  login: 'Logged in',
  login_failed: 'Failed login',
  login_blocked_banned: 'Login blocked (banned)',
  logout: 'Logged out',
  banned_by_admin: 'Banned by an admin',
  unbanned: 'Unbanned',
}

export const ROLE_LABELS: Record<string, string> = { user: 'User', admin: 'Admin', owner: 'Owner' }

// Shared class for the filter inputs.
export const controlClass = 'mt-1 block w-full rounded border border-line bg-white px-3 py-2 text-ink hover:border-muted'
