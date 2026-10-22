import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { primaryButton, secondaryButton } from '../components/buttonStyles'
import { TextWithCode } from '../components/LessonBody'

// A binary search over HTTP status codes that does not find 404, in the lesson's own cells. Lazy
// like every visualization; the message and links below never depend on it.
const NotFoundSearch = lazy(() => import('../visuals/AutoSearchVisual').then((m) => ({ default: m.NotFoundSearch })))

// Every unknown address, including unknown /admin paths and admin pages for non-staff. A
// single-page app answers these with status 200 (docs/ui-public-pages.md), so robots get noindex.
export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-2xl">
      <title>{t('titles.page', { name: t('notFound.title') })}</title>
      <meta name="robots" content="noindex" />
      <h1 className="text-3xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-2 text-lg">
        <TextWithCode text={t('notFound.lead')} />
      </p>
      <section aria-labelledby="not-found-search" className="mt-6">
        <h2 id="not-found-search" className="sr-only">
          {t('notFound.searchTitle')}
        </h2>
        <Suspense fallback={<div aria-hidden="true" className="h-[15.5rem]" />}>
          <NotFoundSearch />
        </Suspense>
      </section>
      <p className="mt-8">{t('notFound.body')}</p>
      <p className="mt-1 text-sm text-muted">{t('notFound.hint')}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/" className={primaryButton}>
          {t('notFound.home')}
        </Link>
        <Link to="/lessons" className={secondaryButton}>
          {t('notFound.lessons')}
        </Link>
      </div>
    </div>
  )
}
