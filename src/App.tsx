import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import AdminContentPage from './pages/admin/AdminContentPage'
import AdminLessonPage from './pages/admin/AdminLessonPage'
import AdminModulePage from './pages/admin/AdminModulePage'
import AdminProblemPage from './pages/admin/AdminProblemPage'
import ChallengesPage from './pages/ChallengesPage'
import HomePage from './pages/HomePage'
import LeaderboardPage from './pages/LeaderboardPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'

// Lazy, so the Monaco editor isn't part of the first bundle.
const LessonPage = lazy(() => import('./pages/LessonPage'))
const ChallengePage = lazy(() => import('./pages/ChallengePage'))

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/lessons/:slug"
          element={
            <Suspense fallback={<p className="text-muted">Loading lesson...</p>}>
              <LessonPage />
            </Suspense>
          }
        />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route
          path="/challenges/:slug"
          element={
            <Suspense fallback={<p className="text-muted">Loading challenge...</p>}>
              <ChallengePage />
            </Suspense>
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Admins only; everyone else sees the not-found page. The backend enforces the role. */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminContentPage />} />
          <Route path="modules/new" element={<AdminModulePage />} />
          <Route path="modules/:id" element={<AdminModulePage />} />
          <Route path="lessons/new" element={<AdminLessonPage />} />
          <Route path="lessons/:id" element={<AdminLessonPage />} />
          <Route path="problems/new" element={<AdminProblemPage />} />
          <Route path="problems/:id" element={<AdminProblemPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
