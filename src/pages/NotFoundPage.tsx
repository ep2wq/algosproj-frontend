import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="max-w-prose">
      <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">
        {t('notFound.body')}{' '}
        <Link to="/" className="rounded text-accent underline underline-offset-2">
          {t('notFound.home')}
        </Link>
        .
      </p>
    </div>
  )
}
