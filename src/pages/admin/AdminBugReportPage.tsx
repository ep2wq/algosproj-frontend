import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ApiError,
  BUG_REPORT_STATUSES,
  deleteBugReport,
  getBugReport,
  getBugReportScreenshot,
  updateBugReport,
  type BugReport,
  type BugReportStatus,
} from '../../api'
import ConfirmAction from '../../components/ConfirmAction'
import ReportProblemButton from '../../components/ReportProblemButton'
import { headRow, table, td, th } from '../../components/tableStyles'
import { BUG_REPORTS_CHANGED } from './AdminNav'
import { StatusChip } from './AdminBugReportsPage'
import { browserLabel, formatTime, reporter } from './format'
import { alertClass, primaryButton, secondaryButton, selectClass } from './styles'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

// A term and its value; user-written and technical values are plain text, left to right.
function Item({ label, children, ltr = false }: { label: string; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="grid gap-x-4 py-1 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined} className={`min-w-0 break-words ${ltr ? 'font-mono text-sm' : ''}`}>
        {children}
      </dd>
    </div>
  )
}

// The screenshot through the owner's session as a blob (never a public URL); a click opens it large.
function Screenshot({ id }: { id: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let active = true
    let objectUrl: string | undefined
    getBugReportScreenshot(id)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  if (failed) return <p className="text-sm text-muted">{t('admin.bugReports.screenshotFailed')}</p>
  if (!url) return <p className="text-sm text-muted">{t('admin.bugReports.screenshotLoading')}</p>
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => ref.current?.showModal()} className="block rounded border border-line">
        <img src={url} alt={t('admin.bugReports.screenshotAlt')} className="max-h-64 rounded" />
        <span className="sr-only">{t('admin.bugReports.enlarge')}</span>
      </button>
      <dialog ref={ref} aria-label={t('admin.bugReports.screenshotAlt')} className="m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-auto rounded-lg border border-line bg-surface p-2 backdrop:bg-black/70">
        <img src={url} alt={t('admin.bugReports.screenshotAlt')} className="max-w-none" />
        <button type="button" autoFocus onClick={() => ref.current?.close()} className={`mt-2 ${secondaryButton}`}>
          {t('admin.bugReports.close')}
        </button>
      </dialog>
    </>
  )
}

// /admin/bug-reports/:id (owner only). Opening it marks the report seen (the API does).
export default function AdminBugReportPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const formId = useId()
  const [report, setReport] = useState<BugReport | null>(null)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState<BugReportStatus>('new')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    let active = true
    getBugReport(id)
      .then((loaded) => {
        if (!active) return
        setReport(loaded)
        setStatus(loaded.status)
        setNote(loaded.admin_note ?? '')
        window.dispatchEvent(new Event(BUG_REPORTS_CHANGED))
      })
      .catch((err) => active && setLoadError(err instanceof ApiError && err.status === 404 ? t('admin.bugReports.notFound') : err instanceof ApiError ? err.message : t('admin.bugReports.loadFailed')))
    return () => {
      active = false
    }
  }, [id, t])

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const saved = await updateBugReport(id, { status, admin_note: note.trim() || null })
      setReport(saved)
      setMessage({ ok: true, text: t('admin.bugReports.saved') })
      window.dispatchEvent(new Event(BUG_REPORTS_CHANGED))
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? Object.values(err.fieldErrors).flat().join(' ') || err.message : t('admin.common.genericError') })
    }
    setBusy(false)
  }

  if (loadError) {
    return (
      <div className="max-w-prose">
        <p role="alert" className={alertClass}>
          {loadError}
        </p>
        <ReportProblemButton context={{ message: loadError }} className={`mt-2 ${secondaryButton}`} />
        <Link to="/admin/bug-reports" className="mt-4 block w-fit rounded text-accent underline underline-offset-2">
          {t('admin.bugReports.back')}
        </Link>
      </div>
    )
  }
  if (!report) return <p className="text-muted">{t('admin.bugReports.loading')}</p>

  const problem = report.problem_context
  return (
    <div className="max-w-4xl">
      <Link to="/admin/bug-reports" className="rounded text-sm text-accent underline underline-offset-2">
        {t('admin.bugReports.back')}
      </Link>
      <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
        {t('admin.bugReports.reportTitle')} <StatusChip status={report.status} />
      </h1>
      <p className="mt-1 text-sm text-muted" title={report.created_at}>
        {formatTime(report.created_at)} · <span className="font-mono">{report.id}</span>
      </p>

      <Group title={t('admin.bugReports.whatHappened')}>
        <p dir="auto" className="whitespace-pre-wrap break-words">
          {report.description}
        </p>
      </Group>

      <Group title={t('admin.bugReports.handling')}>
        <form id={formId} onSubmit={save} className="space-y-3">
          <div>
            <label htmlFor={`${formId}-status`} className="text-sm font-medium">
              {t('admin.bugReports.status')}
            </label>
            <select id={`${formId}-status`} value={status} onChange={(event) => setStatus(event.target.value as BugReportStatus)} className={`${selectClass} border-field sm:w-60`}>
              {BUG_REPORT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.bugReports.statuses.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-note`} className="text-sm font-medium">
              {t('admin.bugReports.note')}
            </label>
            <textarea id={`${formId}-note`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} rows={3} className={`${selectClass} border-field`} />
            <span className="mt-1 block text-xs text-muted">{t('admin.bugReports.noteHint')}</span>
          </div>
          {message && (
            <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm text-pass' : `${alertClass} text-sm`}>
              {message.text}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? t('admin.common.working') : t('admin.bugReports.save')}
          </button>
          {report.handler && (
            <p className="text-xs text-muted">
              {t('admin.bugReports.handledBy', { email: report.handler.email })}
              {report.status_changed_at ? ` · ${formatTime(report.status_changed_at)}` : ''}
            </p>
          )}
        </form>
        <div className="mt-4 border-t border-line pt-4">
          <ConfirmAction
            label={t('admin.bugReports.delete')}
            question={t('admin.bugReports.deleteQuestion')}
            confirmLabel={t('admin.bugReports.deleteConfirm')}
            danger
            onConfirm={async () => {
              await deleteBugReport(id)
              window.dispatchEvent(new Event(BUG_REPORTS_CHANGED))
              navigate('/admin/bug-reports')
            }}
          />
        </div>
      </Group>

      <Group title={t('admin.bugReports.theUser')}>
        <dl>
          <Item label={t('admin.bugReports.reporter')}>{reporter(report, t)}</Item>
          {report.user && (
            <Item label={t('admin.bugReports.account')}>
              <Link to={`/admin/users/${report.user.id}`} className="rounded text-accent underline underline-offset-2">
                <span dir="auto">{report.user.name}</span>
              </Link>
              {' · '}
              {t(`admin.roles.${report.user.role}`)}
            </Item>
          )}
        </dl>
      </Group>

      <Group title={t('admin.bugReports.pageAndDevice')}>
        <dl>
          <Item label={t('admin.bugReports.page')} ltr>
            {report.page_path}
          </Item>
          {report.page_title && <Item label={t('admin.bugReports.pageTitle')}>{report.page_title}</Item>}
          <Item label={t('admin.bugReports.browser')}>
            <span title={report.user_agent ?? ''}>{report.user_agent ? (browserLabel(report.user_agent) ?? report.user_agent) : '-'}</span>
          </Item>
          <Item label={t('admin.bugReports.viewport')} ltr>
            {report.viewport ?? '-'}
          </Item>
          <Item label={t('admin.bugReports.settings')} ltr>
            {[report.language, report.theme, report.timezone, report.app_version].filter(Boolean).join(' · ') || '-'}
          </Item>
        </dl>
      </Group>

      {report.error_context && (
        <Group title={t('admin.bugReports.theError')}>
          <dl>
            {report.error_context.status !== undefined && (
              <Item label={t('admin.bugReports.errorStatus')} ltr>
                {report.error_context.status}
              </Item>
            )}
            {report.error_context.path && (
              <Item label={t('admin.bugReports.errorPath')} ltr>
                {report.error_context.path}
              </Item>
            )}
            {report.error_context.code && (
              <Item label={t('admin.bugReports.errorCode')} ltr>
                {report.error_context.code}
              </Item>
            )}
            {report.error_context.message && <Item label={t('admin.bugReports.errorMessage')}>{report.error_context.message}</Item>}
          </dl>
        </Group>
      )}

      <Group title={t('admin.bugReports.failedRequests')}>
        {report.failed_requests && report.failed_requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={table}>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={`${th} w-20`}>
                    {t('admin.bugReports.method')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.path')}
                  </th>
                  <th scope="col" className={`${th} w-16`}>
                    {t('admin.bugReports.errorStatus')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.errorMessage')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.failed_requests.map((request, index) => (
                  <tr key={index} className="border-b border-line last:border-b-0" title={request.time}>
                    <td className={`${td} font-mono text-xs`}>{request.method}</td>
                    <td dir="ltr" className={`${td} font-mono text-xs break-all`}>
                      {request.path}
                    </td>
                    <td className={`${td} font-mono text-xs`}>{request.status}</td>
                    <td className={`${td} text-xs break-words`}>{request.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">{report.included.diagnostics ? t('admin.bugReports.none') : t('admin.bugReports.notIncluded')}</p>
        )}
      </Group>

      <Group title={t('admin.bugReports.consoleErrors')}>
        {report.console_errors && report.console_errors.length > 0 ? (
          <ul className="space-y-1">
            {report.console_errors.map((entry, index) => (
              <li key={index} dir="ltr" title={entry.time} className="font-mono text-xs break-words">
                {entry.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{report.included.diagnostics ? t('admin.bugReports.none') : t('admin.bugReports.notIncluded')}</p>
        )}
      </Group>

      <Group title={t('admin.bugReports.codeAndProblem')}>
        {problem ? (
          <>
            <dl>
              <Item label={t('admin.bugReports.problem')} ltr>
                {problem.slug ?? '-'}
              </Item>
              <Item label={t('admin.bugReports.language')} ltr>
                {problem.language ?? '-'}
              </Item>
              {problem.result && (
                <Item label={t('admin.bugReports.lastResult')} ltr>
                  {t('admin.bugReports.resultLine', { status: problem.result.status ?? '-', passed: problem.result.passed_count ?? '-', total: problem.result.total_count ?? '-' })}
                  {problem.result.message ? ` · ${problem.result.message}` : ''}
                </Item>
              )}
            </dl>
            {problem.code && (
              <pre role="region" aria-label={t('admin.bugReports.codeLabel')} tabIndex={0} dir="ltr" className="mt-2 max-h-96 overflow-auto rounded bg-code p-3 font-mono text-xs">
                {problem.code}
              </pre>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">{report.included.problem === false ? t('admin.bugReports.notIncluded') : t('admin.bugReports.none')}</p>
        )}
      </Group>

      <Group title={t('admin.bugReports.screenshot')}>
        {report.has_screenshot ? <Screenshot id={report.id} /> : <p className="text-sm text-muted">{t('admin.bugReports.noScreenshot')}</p>}
      </Group>
    </div>
  )
}
