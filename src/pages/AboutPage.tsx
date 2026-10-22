import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LessonBody from '../components/LessonBody'
import PageMeta from '../components/PageMeta'
import { formatNumber } from '../i18n'
import { VISUALS } from '../visuals'

// Plain text in the lesson format (## headings, - lists), so it reads like the lessons.
export default function AboutPage() {
  const { t, i18n } = useTranslation()
  return (
    <div>
      <PageMeta title={t('about.title')} description={t('about.metaDescription')} path="/about" />
      <h1 className="text-3xl font-semibold tracking-tight">{t('about.title')}</h1>
      <p className="mt-3 max-w-prose text-lg">{t('about.intro')}</p>
      <LessonBody text={t('about.body', { visuals: formatNumber(VISUALS.size, i18n.language) })} lang={i18n.language} />
      <p className="mt-10 max-w-prose text-muted">
        {t('about.more')}{' '}
        <Link to="/faq" className="rounded text-accent underline underline-offset-2">
          {t('nav.faq')}
        </Link>{' '}
        <span aria-hidden="true">·</span>{' '}
        <Link to="/contact" className="rounded text-accent underline underline-offset-2">
          {t('nav.contact')}
        </Link>
      </p>
    </div>
  )
}
