import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LessonBody from '../components/LessonBody'
import PageMeta from '../components/PageMeta'
import { CONTACT_EMAIL } from '../site'

// No form: the site has no mail provider yet (docs/ui-public-pages.md). The address is
// CONTACT_EMAIL in src/site.ts.
export default function ContactPage() {
  const { t, i18n } = useTranslation()
  return (
    <div className="max-w-prose">
      <PageMeta title={t('contact.title')} description={t('contact.metaDescription')} path="/contact" />
      <h1 className="text-3xl font-semibold tracking-tight">{t('contact.title')}</h1>
      <p className="mt-3 text-lg">
        {t('contact.faqFirst')}{' '}
        <Link to="/faq" className="rounded text-accent underline underline-offset-2">
          {t('contact.faqLink')}
        </Link>
      </p>
      <div className="mt-8 rounded-lg border border-line bg-surface p-5">
        <h2 className="text-xl font-semibold">{t('contact.emailTitle')}</h2>
        <p className="mt-2">
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="rounded text-lg font-medium break-all text-accent underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-3 text-sm text-muted">{t('contact.reply')}</p>
      </div>
      <LessonBody text={t('contact.body')} lang={i18n.language} />
      <p className="mt-6">
        <Link to="/privacy" className="rounded text-accent underline underline-offset-2">
          {t('contact.privacyLink')}
        </Link>
      </p>
    </div>
  )
}
