import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ApiError, HONEYPOT_FIELD, sendBugReport, type BugReportIncluded } from '../api'
import { useAuth } from '../auth'
import { captured } from '../capture'
import { formatNumber } from '../i18n'
import { currentProblem, type BugReportRequest } from '../reportBug'
import { CONTACT_EMAIL } from '../site'
import { useTheme } from '../theme'
import { primaryButton, secondaryButton } from './buttonStyles'
import './bugReportI18n'

const MIN = 10
const MAX = 2000

// The build: the hash in the name of the main script (index-<hash>.js), "dev" in development.
function appVersion(): string {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')
  return script?.src.match(/\/assets\/[^/]*?-([\w-]+)\.js/)?.[1] ?? 'dev'
}

function Row({ label, reason, children }: { label: string; reason: string; children?: ReactNode }) {
  return (
    <li className="py-1.5">
      <span className="font-medium">{label}</span>
      {children}
      <span className="block text-xs text-muted">{reason}</span>
    </li>
  )
}

// An optional part: its own checkbox, ticked by default; the whole row is the label (44 px).
function Part({ checked, onChange, label, reason, children }: { checked: boolean; onChange: (checked: boolean) => void; label: string; reason: string; children?: ReactNode }) {
  return (
    <li className="py-1">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
        <span>
          <span className="font-medium">{label}</span>
          <span className="block text-xs text-muted">{reason}</span>
        </span>
      </label>
      {children && <div className="ms-8">{children}</div>}
    </li>
  )
}

const Value = ({ children }: { children: ReactNode }) => (
  <span dir="ltr" className="block truncate font-mono text-xs text-muted">
    {children}
  </span>
)

// The "Report a bug" dialog (README "Bug reports"): a native modal dialog like the Security page's
// ban dialog. The user sees every part that is sent and can untick each optional one.
export default function BugReportDialog({ error, screenshot, onClose }: BugReportRequest & { onClose: () => void }) {
  const { t, i18n } = useTranslation('bugReport')
  const { user } = useAuth()
  const { dark } = useTheme()
  const location = useLocation()
  const id = useId()
  const ref = useRef<HTMLDialogElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // What exists at the moment the dialog opened.
  const [snapshot] = useState(() => ({ ...captured(), problem: currentProblem(), time: new Date() }))
  const [shot, setShot] = useState<{ state: 'pending' | 'ready' | 'failed'; blob?: Blob; url?: string }>({ state: 'pending' })
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [parts, setParts] = useState<BugReportIncluded>({ account: true, diagnostics: true, screenshot: true, problem: true })
  const [state, setState] = useState<{ step: 'form' | 'sending' | 'sent'; reference?: string; message?: string; mail?: boolean; fields?: Record<string, string[]> }>({ step: 'form' })
  const [tooShort, setTooShort] = useState(false)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    let active = true
    let url: string | undefined
    screenshot.then((blob) => {
      if (!active) return
      if (blob) {
        url = URL.createObjectURL(blob)
        setShot({ state: 'ready', blob, url })
      } else {
        setShot({ state: 'failed' })
      }
    })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [screenshot])

  const length = description.trim().length
  const set = (key: keyof BugReportIncluded) => (checked: boolean) => setParts({ ...parts, [key]: checked })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (length < MIN) {
      setTooShort(true)
      descriptionRef.current?.focus()
      return
    }
    setState({ step: 'sending' })
    const included = {
      account: Boolean(user) && parts.account,
      diagnostics: parts.diagnostics,
      screenshot: parts.screenshot && shot.state === 'ready',
      problem: Boolean(snapshot.problem) && parts.problem,
    }
    const form = new FormData()
    form.append('description', description.trim())
    if (!user && email.trim()) form.append('contact_email', email.trim())
    form.append('page_path', location.pathname)
    form.append('page_title', document.title.slice(0, 255))
    form.append('app_version', appVersion())
    form.append('language', i18n.language === 'ar' ? 'ar' : 'en')
    form.append('theme', dark ? 'dark' : 'light')
    form.append('viewport', `${window.innerWidth}x${window.innerHeight}`)
    form.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    if (error) form.append('error_context', JSON.stringify(error))
    if (included.diagnostics) {
      form.append('failed_requests', JSON.stringify(snapshot.failed))
      form.append('console_errors', JSON.stringify(snapshot.errors))
    }
    if (included.problem) form.append('problem_context', JSON.stringify(snapshot.problem))
    if (included.screenshot && shot.blob) form.append('screenshot', shot.blob, shot.blob.type === 'image/webp' ? 'screenshot.webp' : 'screenshot.png')
    form.append('included', JSON.stringify(included))
    const trap = honeypotRef.current?.value ?? ''
    if (trap) form.append(HONEYPOT_FIELD, trap)

    try {
      const { id: reference } = await sendBugReport(form)
      setState({ step: 'sent', reference })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setState({ step: 'form', message: Object.values(err.fieldErrors).flat().join(' ') || err.message, fields: err.fieldErrors })
      } else if (err instanceof ApiError && err.status === 429) {
        setState({ step: 'form', message: t('bugReport.tooMany') })
      } else {
        setState({ step: 'form', message: t('bugReport.failed'), mail: true })
      }
    }
  }

  const busy = state.step === 'sending'
  const counterId = `${id}-counter`
  const errorId = `${id}-error`
  // Server field errors (422) also show under their field, linked with aria-describedby.
  const descriptionError = state.fields?.description?.join(' ')
  const emailError = state.fields?.contact_email?.join(' ')

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-4 text-ink backdrop:bg-black/50 sm:p-5"
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {t('bugReport.title')}
      </h2>

      {state.step === 'sent' ? (
        <div className="mt-3 space-y-3" role="status">
          <p>{t('bugReport.sent')}</p>
          <p className="text-sm text-muted">
            {t('bugReport.reference')}{' '}
            <span dir="ltr" className="font-mono text-ink">
              {state.reference}
            </span>
          </p>
          <button type="button" autoFocus onClick={() => ref.current?.close()} className={primaryButton}>
            {t('bugReport.close')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-3 space-y-4">
          <div aria-hidden="true" className="absolute -start-[10000px] top-0 size-px overflow-hidden">
            <input ref={honeypotRef} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <p className="text-sm text-muted">{t('bugReport.intro')}</p>

          <div>
            <label htmlFor={`${id}-description`} className="font-medium">
              {t('bugReport.description')}
            </label>
            <textarea
              ref={descriptionRef}
              id={`${id}-description`}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                setTooShort(false)
              }}
              required
              rows={4}
              maxLength={MAX}
              aria-invalid={tooShort || Boolean(descriptionError) || undefined}
              aria-describedby={`${counterId}${tooShort || descriptionError ? ` ${errorId}` : ''}`}
              className="mt-1 block w-full rounded border border-field bg-surface px-3 py-2 text-ink"
            />
            <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
              <span>{t('bugReport.descriptionHint', { min: MIN })}</span>
              <span id={counterId} className="font-mono tabular-nums" dir="ltr">
                {t('bugReport.counter', { used: formatNumber(description.length, i18n.language), max: formatNumber(MAX, i18n.language) })}
              </span>
            </div>
            {tooShort ? (
              <p id={errorId} role="alert" className="mt-1 text-sm text-fail">
                {t('bugReport.tooShort', { min: MIN })}
              </p>
            ) : (
              descriptionError && (
                <p id={errorId} className="mt-1 text-sm text-fail">
                  {descriptionError}
                </p>
              )
            )}
          </div>

          {user ? (
            <p className="text-sm text-muted">{t('bugReport.accountEmail')}</p>
          ) : (
            <div>
              <label htmlFor={`${id}-email`} className="font-medium">
                {t('bugReport.email')}
              </label>
              <input
                id={`${id}-email`}
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={255}
                aria-invalid={Boolean(emailError) || undefined}
                aria-describedby={`${id}-email-hint${emailError ? ` ${id}-email-error` : ''}`}
                className="mt-1 block w-full rounded border border-field bg-surface px-3 py-2 text-ink"
              />
              <span id={`${id}-email-hint`} className="mt-1 block text-xs text-muted">
                {t('bugReport.emailHint')}
              </span>
              {emailError && (
                <p id={`${id}-email-error`} className="mt-1 text-sm text-fail">
                  {emailError}
                </p>
              )}
            </div>
          )}

          <section aria-labelledby={`${id}-sent`} className="rounded border border-line p-3">
            <h3 id={`${id}-sent`} className="font-semibold">
              {t('bugReport.whatIsSent')}
            </h3>
            <p className="mt-2 text-xs font-medium tracking-wide text-muted uppercase">{t('bugReport.always')}</p>
            <ul className="text-sm">
              <Row label={t('bugReport.page')} reason={t('bugReport.pageWhy')}>
                <Value>{location.pathname}</Value>
              </Row>
              <Row label={t('bugReport.time')} reason={t('bugReport.timeWhy')} />
              <Row label={t('bugReport.device')} reason={t('bugReport.deviceWhy')}>
                <Value>
                  {t('bugReport.viewport', { width: window.innerWidth, height: window.innerHeight })}
                  {' · '}
                  {navigator.userAgent}
                </Value>
              </Row>
              <Row label={t('bugReport.settings')} reason={t('bugReport.settingsWhy')} />
              {error && (
                <Row label={t('bugReport.error')} reason={t('bugReport.errorWhy')}>
                  <Value>
                    {[error.status, error.path, error.message].filter((part) => part !== undefined && part !== '').join(' · ')}
                  </Value>
                </Row>
              )}
            </ul>
            <p className="mt-3 text-xs font-medium tracking-wide text-muted uppercase">{t('bugReport.optional')}</p>
            <ul className="text-sm">
              {user && (
                <Part checked={parts.account} onChange={set('account')} label={t('bugReport.account')} reason={t('bugReport.accountWhy')}>
                  <Value>
                    {user.email} · {user.role}
                  </Value>
                </Part>
              )}
              <Part checked={parts.diagnostics} onChange={set('diagnostics')} label={t('bugReport.diagnostics')} reason={t('bugReport.diagnosticsWhy')}>
                <span className="block text-xs text-muted">
                  {t('bugReport.failedRequests', { number: formatNumber(snapshot.failed.length, i18n.language) })} ·{' '}
                  {t('bugReport.consoleErrors', { number: formatNumber(snapshot.errors.length, i18n.language) })}
                </span>
              </Part>
              <Part checked={parts.screenshot && shot.state === 'ready'} onChange={set('screenshot')} label={t('bugReport.screenshot')} reason={t('bugReport.screenshotWhy')}>
                {shot.state === 'pending' && <span className="block text-xs text-muted">{t('bugReport.screenshotPending')}</span>}
                {shot.state === 'failed' && <span className="block text-xs text-muted">{t('bugReport.screenshotFailed')}</span>}
                {shot.state === 'ready' && (
                  <>
                    <img src={shot.url} alt={t('bugReport.screenshotAlt')} className="mt-1 max-h-32 rounded border border-line" />
                    <span className="mt-1 block text-xs text-muted">{t('bugReport.screenshotMasked')}</span>
                  </>
                )}
              </Part>
              {snapshot.problem && (
                <Part checked={parts.problem} onChange={set('problem')} label={t('bugReport.problem')} reason={t('bugReport.problemWhy')}>
                  <span className="block text-xs text-muted">{t('bugReport.problemNote')}</span>
                </Part>
              )}
            </ul>
          </section>

          {state.message && (
            <p role="alert" className="rounded border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-fail">
              {state.message}
              {state.mail && (
                <>
                  {' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="font-medium underline">
                    {CONTACT_EMAIL}
                  </a>
                </>
              )}
            </p>
          )}

          <p className="text-xs text-muted">
            {t('bugReport.privacy')}{' '}
            <Link to="/privacy" onClick={() => ref.current?.close()} className="font-medium text-accent underline-offset-4 hover:underline">
              {t('bugReport.privacyLink')}
            </Link>
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={`${primaryButton} disabled:opacity-60`}>
              {busy ? t('bugReport.sending') : t('bugReport.send')}
            </button>
            <button type="button" disabled={busy} onClick={() => ref.current?.close()} className={secondaryButton}>
              {t('bugReport.cancel')}
            </button>
          </div>
        </form>
      )}
    </dialog>
  )
}
