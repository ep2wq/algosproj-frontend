import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
