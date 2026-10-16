import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import NotFoundPage from '../pages/NotFoundPage'

// Guests and non-admins see the same page as an unknown address. This only hides the pages;
// the backend refuses every admin request from a non-admin (403) or a guest (401).
export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) return <p className="text-muted">Loading...</p>
  if (user?.role !== 'admin') return <NotFoundPage />
  return <Outlet />
}
