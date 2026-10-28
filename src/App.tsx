import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import { CellLoader } from './components/Loading'
import OwnerRoute from './components/OwnerRoute'
import AboutPage from './pages/AboutPage'
import ChallengesPage from './pages/ChallengesPage'
import ContactPage from './pages/ContactPage'
import FaqPage from './pages/FaqPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LandingPage from './pages/LandingPage'
import LeaderboardPage from './pages/LeaderboardPage'
import { CookiesPage, PrivacyPage, TermsPage } from './pages/LegalPages'
import LessonsPage from './pages/LessonsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

// Lazy, so the Monaco editor isn't part of the first bundle.
const LessonPage = lazy(() => import('./pages/LessonPage'))
const ChallengePage = lazy(() => import('./pages/ChallengePage'))
// The admin pages, one chunk for all of them, only ever fetched for admins and owners.
const admin = () => import('./pages/admin')
const AdminActivityPage = lazy(() => admin().then((m) => ({ default: m.AdminActivityPage })))
const AdminAuditLogPage = lazy(() => admin().then((m) => ({ default: m.AdminAuditLogPage })))
const AdminContentPage = lazy(() => admin().then((m) => ({ default: m.AdminContentPage })))
const AdminLessonPage = lazy(() => admin().then((m) => ({ default: m.AdminLessonPage })))
const AdminModulePage = lazy(() => admin().then((m) => ({ default: m.AdminModulePage })))
const AdminProblemPage = lazy(() => admin().then((m) => ({ default: m.AdminProblemPage })))
const AdminUserPage = lazy(() => admin().then((m) => ({ default: m.AdminUserPage })))
const AdminUsersPage = lazy(() => admin().then((m) => ({ default: m.AdminUsersPage })))

function App() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const staff = user?.role === 'admin' || user?.role === 'owner'

  // Staff only: fetch the admin chunk in the background, so the first admin page opens without a
  // loader. A failure here is ignored; opening an admin page loads it again.
  useEffect(() => {
    if (staff) admin().catch(() => {})
  }, [staff])

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* The public pages below are also prerendered to static HTML (src/prerender.ts). */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/lessons" element={<LessonsPage />} />
        <Route
          path="/lessons/:slug"
          element={
            <Suspense fallback={<CellLoader label={t('lesson.loading')} className="min-h-screen items-start pt-20" />}>
              <LessonPage />
            </Suspense>
          }
        />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route
          path="/challenges/:slug"
          element={
            <Suspense fallback={<CellLoader label={t('challenge.loading')} className="min-h-screen items-start pt-20" />}>
              <ChallengePage />
            </Suspense>
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Email links land on these (backend README "Email"); noindex, not prerendered. */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        {/* Admins only; everyone else sees the not-found page. The backend enforces the role. */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminContentPage />} />
          <Route path="modules/new" element={<AdminModulePage />} />
          <Route path="modules/:id" element={<AdminModulePage />} />
          <Route path="lessons/new" element={<AdminLessonPage />} />
          <Route path="lessons/:id" element={<AdminLessonPage />} />
          <Route path="problems/new" element={<AdminProblemPage />} />
          <Route path="problems/:id" element={<AdminProblemPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserPage />} />
          {/* Owners only; admins see not-found. The backend answers them with 403. */}
          <Route element={<OwnerRoute />}>
            <Route path="audit-log" element={<AdminAuditLogPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
          </Route>
        </Route>
        {/* Every other address, unknown /admin paths too: the 404 page in the interface language. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
