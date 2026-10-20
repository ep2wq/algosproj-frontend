import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-prose">
      <title>{t('titles.page', { name: t('notFound.title') })}</title>
      {/* A signpost: decoration only. */}
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-12 text-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 6v36M16 42h16" />
        <path d="M24 12h13l4 4-4 4H24M24 24H11l-4 4 4 4h13" />
      </svg>
      <h1 className="mt-4 text-2xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">
        {t('notFound.body')}{' '}
        <Link to="/" className="rounded text-accent underline underline-offset-2">
          {t('notFound.home')}
        </Link>
        .
      </p>
      <p className="mt-1 text-sm text-muted">{t('notFound.hint')}</p>
    </div>
  )
}
