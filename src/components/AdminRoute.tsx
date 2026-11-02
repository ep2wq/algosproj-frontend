import type { i18n as I18n } from 'i18next'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import { CellLoader } from './Loading'
import NotFoundPage from '../pages/NotFoundPage'

// Underline tabs like the site nav: the current one ink with an accent bar under the word (not
// colour alone), the others muted.
const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded px-2 hover:text-ink ${isActive ? 'font-medium text-ink underline decoration-accent decoration-2 underline-offset-[6px]' : 'text-muted'}`

// The admin area's own i18next instance, fixed to English: it shares the strings of the app's
// instance but never follows its language, so shared components under it (DifficultyBadge, Field,
// LessonBody, Pagination...) render English on an Arabic site too. Made on first use, after
// src/i18n.ts has initialised the app's instance.
let english: I18n | null = null
function useEnglish(i18n: I18n): I18n {
  english ??= i18n.cloneInstance({ lng: 'en' })
  return english
}

// Guests and users who are neither admin nor owner see the same page as an unknown address. This
// only hides the pages; the backend refuses every admin request from them (401 or 403).
export default function AdminRoute() {
  const { i18n } = useTranslation()
  const en = useEnglish(i18n)
  const t = en.t
  const { user, loading } = useAuth()

  if (loading) return <CellLoader label={t('admin.common.loading')} className="min-h-screen items-start pt-20" />
  if (user?.role !== 'admin' && user?.role !== 'owner') return <NotFoundPage />
  // Staff only: always English and left to right, whatever the interface language.
  return (
    <I18nextProvider i18n={en}>
      <div lang="en" dir="ltr">
        <title>{t('admin.pageTitle')}</title>
        <nav aria-label={t('admin.nav.label')} className="mb-6 flex flex-wrap gap-x-2 border-b border-line pb-1">
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
    </I18nextProvider>
  )
}
