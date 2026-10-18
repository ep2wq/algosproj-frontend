import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import NotFoundPage from '../pages/NotFoundPage'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 hover:text-accent ${isActive ? 'bg-accent-soft font-medium text-ink' : 'text-muted'}`

// Guests and users who are neither admin nor owner see the same page as an unknown address. This
// only hides the pages; the backend refuses every admin request from them (401 or 403).
export default function AdminRoute() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()

  if (loading) return <p className="text-muted">{t('admin.common.loading')}</p>
  if (user?.role !== 'admin' && user?.role !== 'owner') return <NotFoundPage />
  // Staff only: always English and left to right, whatever the interface language.
  return (
    <div lang="en" dir="ltr">
      <nav aria-label={t('admin.nav.label')} className="mb-6 flex flex-wrap gap-1 border-b border-line pb-3 text-sm">
        <NavLink to="/admin" end className={tabClass}>
          {t('admin.nav.content')}
        </NavLink>
        <NavLink to="/admin/users" className={tabClass}>
          {t('admin.nav.users')}
        </NavLink>
        {user.role === 'owner' && (
          <>
            <NavLink to="/admin/audit-log" className={tabClass}>
              {t('admin.nav.auditLog')}
            </NavLink>
            <NavLink to="/admin/activity" className={tabClass}>
              {t('admin.nav.activity')}
            </NavLink>
          </>
        )}
      </nav>
      <Outlet />
    </div>
  )
}
