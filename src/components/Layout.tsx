import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 hover:text-accent ${isActive ? 'text-ink font-medium' : 'text-muted'}`

export default function Layout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="rounded text-lg font-semibold tracking-tight text-ink">
            AlgosProj
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            <NavLink to="/" end className={navLink}>
              Lessons
            </NavLink>
            <NavLink to="/challenges" className={navLink}>
              Challenges
            </NavLink>
            <NavLink to="/leaderboard" className={navLink}>
              Leaderboard
            </NavLink>
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <NavLink to="/admin" className={navLink}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {loading ? null : user ? (
              <>
                <span className="text-ink">
                  {user.name}{' '}
                  <span className="ml-1 rounded bg-accent-soft px-1.5 py-0.5 text-accent tabular-nums">
                    {user.points} {user.points === 1 ? 'point' : 'points'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded px-2 py-1 text-muted hover:text-accent"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  state={{ from: location }}
                  className="rounded px-2 py-1 text-muted hover:text-accent"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  state={{ from: location }}
                  className="rounded border border-accent px-3 py-1 text-accent hover:bg-accent-soft"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
