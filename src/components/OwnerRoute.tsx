import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import NotFoundPage from '../pages/NotFoundPage'

// Inside AdminRoute: admins see "Page not found" here too. The backend answers them with 403.
export default function OwnerRoute() {
  const { user } = useAuth()

  if (user?.role !== 'owner') return <NotFoundPage />
  return <Outlet />
}
