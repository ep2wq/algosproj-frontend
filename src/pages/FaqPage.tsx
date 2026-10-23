import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LessonBody from '../components/LessonBody'
import PageMeta from '../components/PageMeta'
import ScrollProgress from '../components/ScrollProgress'
import { CONTACT_EMAIL } from '../site'

// Each answer is checked against the code (docs/ui-public-pages.md "Content facts"); change it
// when the behaviour changes.
const QUESTIONS = [
  'free',
  'account',
  'languages',
  'grading',
  'noPoints',
  'safe',
  'points',
  'arabic',
  'loggedOut',
  'deleteAccount',
  'aiTutor',
]

// Native <details>: opens and closes without script, with the keyboard, and in the static HTML.
export default function FaqPage() {
  const { t, i18n } = useTranslation()
  return (
    <div className="max-w-3xl">
      <PageMeta title={t('faq.title')} description={t('faq.metaDescription')} path="/faq" />
      <ScrollProgress />
      <h1 className="text-3xl font-semibold tracking-tight">{t('faq.title')}</h1>
      <p className="mt-3 max-w-prose text-lg">{t('faq.intro')}</p>
      <div className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {QUESTIONS.map((id) => (
          <details key={id} id={id} className="group px-4">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded py-3 font-medium hover:text-accent [&::-webkit-details-marker]:hidden">
              <span>{t(`faq.items.${id}.q`)}</span>
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </summary>
            <div className="pb-4">
              <LessonBody text={t(`faq.items.${id}.a`)} lang={i18n.language} />
            </div>
          </details>
        ))}
      </div>
      <p className="mt-8 max-w-prose text-muted">
        {t('faq.stillStuck')}{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="rounded text-accent underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>{' '}
        <span aria-hidden="true">·</span>{' '}
        <Link to="/contact" className="rounded text-accent underline underline-offset-2">
          {t('nav.contact')}
        </Link>
      </p>
    </div>
  )
}
