import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LessonBody, { TextWithCode } from '../components/LessonBody'
import PageMeta from '../components/PageMeta'
import ScrollProgress from '../components/ScrollProgress'
import { formatDate } from '../i18n'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../site'

// DRAFTS. The Terms, Privacy and Cookies texts are plain-language drafts written from what the code
// does (the facts and their files are listed in docs/ui-public-pages.md "Content facts"). They
// have not been reviewed by a lawyer and need review by a qualified person before launch. When the
// text changes, change LEGAL_UPDATED in src/site.ts too.

type Name = 'terms' | 'privacy' | 'cookies'

const RELATED: Record<Name, Name[]> = {
  terms: ['privacy', 'cookies'],
  privacy: ['cookies', 'terms'],
  cookies: ['privacy', 'terms'],
}

// Every cookie and browser storage key the site uses. All are strictly necessary or a setting the
// visitor chose, so the cookie notice (CookieNotice.tsx) only informs and asks for no consent.
const STORAGE = ['session', 'xsrf', 'remember', 'lang', 'theme', 'sound', 'cookieNotice']

function LegalPage({ name }: { name: Name }) {
  const { t, i18n } = useTranslation()
  return (
    <div>
      <PageMeta title={t(`${name}.title`)} description={t(`${name}.metaDescription`)} path={`/${name}`} />
      <ScrollProgress />
      <h1 className="text-3xl font-semibold tracking-tight">{t(`${name}.title`)}</h1>
      <p className="mt-2 text-sm text-muted">{t('legal.updated', { date: formatDate(LEGAL_UPDATED, i18n.language) })}</p>
      <LessonBody text={t(`${name}.body`)} lang={i18n.language} />

      {/* Cards on a phone, a table from sm (the same rows). */}
      {name === 'cookies' && (
        <section aria-labelledby="storage-list" className="mt-8 sm:hidden">
          <h2 id="storage-list" className="font-semibold">
            {t('cookies.table.caption')}
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {STORAGE.map((id) => (
              <li key={id} className="px-4 py-3">
                <p className="font-medium">
                  <TextWithCode text={t(`cookies.rows.${id}.name`)} />
                </p>
                <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                  {(['kind', 'purpose', 'duration', 'necessary'] as const).map((field) => (
                    <div key={field} className="contents">
                      <dt className="text-muted">{t(`cookies.table.${field}`)}</dt>
                      <dd>
                        <TextWithCode text={t(`cookies.rows.${id}.${field}`)} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
      {name === 'cookies' && (
        <div className="mt-8 hidden overflow-x-auto rounded-lg border border-line bg-surface sm:block" tabIndex={0} role="region" aria-labelledby="storage-caption">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <caption id="storage-caption" className="px-4 pt-3 text-start font-semibold">
              {t('cookies.table.caption')}
            </caption>
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('cookies.table.name')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('cookies.table.kind')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('cookies.table.purpose')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('cookies.table.duration')}
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t('cookies.table.necessary')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {STORAGE.map((id) => (
                <tr key={id}>
                  <th scope="row" className="px-4 py-2 font-medium">
                    <TextWithCode text={t(`cookies.rows.${id}.name`)} />
                  </th>
                  <td className="px-4 py-2">{t(`cookies.rows.${id}.kind`)}</td>
                  <td className="px-4 py-2">
                    <TextWithCode text={t(`cookies.rows.${id}.purpose`)} />
                  </td>
                  <td className="px-4 py-2">{t(`cookies.rows.${id}.duration`)}</td>
                  <td className="px-4 py-2">{t(`cookies.rows.${id}.necessary`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section aria-labelledby="legal-contact" className="mt-10 max-w-prose rounded-lg border border-line bg-surface p-5">
        <h2 id="legal-contact" className="font-semibold">
          {t('legal.contactTitle')}
        </h2>
        <p className="mt-1 text-muted">{t('legal.contactBody')}</p>
        <p className="mt-2">
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="rounded font-medium break-all text-accent underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1">
        {RELATED[name].map((other) => (
          <Link key={other} to={`/${other}`} className="inline-flex min-h-11 items-center rounded text-accent underline underline-offset-2 sm:pointer-fine:min-h-0">
            {t(`${other}.title`)}
          </Link>
        ))}
      </p>
    </div>
  )
}

export function TermsPage() {
  return <LegalPage name="terms" />
}

export function PrivacyPage() {
  return <LegalPage name="privacy" />
}

export function CookiesPage() {
  return <LegalPage name="cookies" />
}
