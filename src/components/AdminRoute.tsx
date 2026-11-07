import { lazy, useEffect, useState } from 'react'
import type { i18n as I18n } from 'i18next'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import { hasStrings, loadStrings } from '../i18n'
import { CellLoader } from './Loading'
import NotFoundPage from '../pages/NotFoundPage'

// The tabs come with the admin chunk (the same one as the pages), so they show together with the page.
const AdminNav = lazy(() => import('../pages/admin').then((m) => ({ default: m.AdminNav })))

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
  // On an Arabic site the English strings are not loaded yet (src/i18n.ts): load them here, and in
  // the meantime show the silent loader (its label is one of those strings). api.ts's English
  // messages for /admin requests come from the same strings; only these pages send them.
  const [englishReady, setEnglishReady] = useState(() => hasStrings('en'))
  useEffect(() => {
    if (!englishReady) void loadStrings('en').then(() => setEnglishReady(true))
  }, [englishReady])

  if (!englishReady) return <CellLoader className="min-h-screen items-start pt-20" />
  if (loading) return <CellLoader label={t('admin.common.loading')} className="min-h-screen items-start pt-20" />
  if (user?.role !== 'admin' && user?.role !== 'owner') return <NotFoundPage />
  // Staff only: always English and left to right, whatever the interface language.
  return (
    <I18nextProvider i18n={en}>
      <div lang="en" dir="ltr">
        <title>{t('admin.pageTitle')}</title>
        <AdminNav />
        <Outlet />
      </div>
    </I18nextProvider>
  )
}
