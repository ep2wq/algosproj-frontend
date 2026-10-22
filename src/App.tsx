import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import OwnerRoute from './components/OwnerRoute'
import AdminActivityPage from './pages/admin/AdminActivityPage'
import AdminAuditLogPage from './pages/admin/AdminAuditLogPage'
import AdminContentPage from './pages/admin/AdminContentPage'
import AdminLessonPage from './pages/admin/AdminLessonPage'
import AdminModulePage from './pages/admin/AdminModulePage'
import AdminProblemPage from './pages/admin/AdminProblemPage'
import AdminUserPage from './pages/admin/AdminUserPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AboutPage from './pages/AboutPage'
import ChallengesPage from './pages/ChallengesPage'
import ContactPage from './pages/ContactPage'
import FaqPage from './pages/FaqPage'
import LandingPage from './pages/LandingPage'
import LeaderboardPage from './pages/LeaderboardPage'
import { CookiesPage, PrivacyPage, TermsPage } from './pages/LegalPages'
import LessonsPage from './pages/LessonsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'

// Lazy, so the Monaco editor isn't part of the first bundle.
const LessonPage = lazy(() => import('./pages/LessonPage'))
const ChallengePage = lazy(() => import('./pages/ChallengePage'))

function App() {
  const { t } = useTranslation()
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
            <Suspense fallback={<p className="text-muted">{t('lesson.loading')}</p>}>
              <LessonPage />
            </Suspense>
          }
        />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route
          path="/challenges/:slug"
          element={
            <Suspense fallback={<p className="text-muted">{t('challenge.loading')}</p>}>
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
