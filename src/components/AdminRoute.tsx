import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import NotFoundPage from '../pages/NotFoundPage'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 hover:text-accent ${isActive ? 'bg-accent-soft font-medium text-ink' : 'text-muted'}`

// Guests and users who are neither admin nor owner see the same page as an unknown address. This
// only hides the pages; the backend refuses every admin request from them (401 or 403).
export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) return <p className="text-muted">Loading...</p>
  if (user?.role !== 'admin' && user?.role !== 'owner') return <NotFoundPage />
  return (
    <>
      <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-1 border-b border-line pb-3 text-sm">
        <NavLink to="/admin" end className={tabClass}>
          Content
        </NavLink>
        <NavLink to="/admin/users" className={tabClass}>
          Users
        </NavLink>
        {user.role === 'owner' && (
          <>
            <NavLink to="/admin/audit-log" className={tabClass}>
              Audit log
            </NavLink>
            <NavLink to="/admin/activity" className={tabClass}>
              Activity
            </NavLink>
          </>
        )}
      </nav>
      <Outlet />
    </>
  )
}
