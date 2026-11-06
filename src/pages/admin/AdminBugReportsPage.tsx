import { Image } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, BUG_REPORT_STATUSES, getBugReports, type BugReportRow, type BugReportStatus, type Page } from '../../api'
import ReportProblemButton from '../../components/ReportProblemButton'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import { cardList, headRow, row, table, tableCard, td, th, truncate } from '../../components/tableStyles'
import { formatNumber } from '../../i18n'
import { formatTime, reporter, shortDate } from './format'
import { alertClass, secondaryButton } from './styles'

const EMPTY = { status: '', seen: '', search: '', screenshot: '', page: '' }

// New sky, in progress amber, fixed green, won't fix outlined: a word in each, never colour alone.
const STATUS_STYLE: Record<BugReportStatus, string> = {
  new: 'border-sky-700/40 bg-sky-500/10 text-sky-800 dark:border-sky-300/40 dark:text-sky-300',
  in_progress: 'border-amber-700/40 bg-amber-500/10 text-amber-800 dark:border-amber-300/40 dark:text-amber-300',
  fixed: 'border-pass/40 bg-pass/10 text-pass',
  wont_fix: 'border-field text-muted',
}

export function StatusChip({ status }: { status: BugReportStatus }) {
  const { t } = useTranslation()
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}>{t(`admin.bugReports.statuses.${status}`)}</span>
}

// The description (links to the report; the link covers the whole row), unseen ones in bold.
function ReportLink({ report }: { report: BugReportRow }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/admin/bug-reports/${report.id}`}
      className={`${truncate} rounded text-ink underline-offset-4 after:absolute after:inset-0 hover:underline ${report.seen_at ? '' : 'font-semibold'}`}
      title={report.description}
    >
      {!report.seen_at && <span className="sr-only">{t('admin.bugReports.unseenLabel')} </span>}
      <span dir="auto">{report.description}</span>
    </Link>
  )
}

function ShotIcon({ report }: { report: BugReportRow }) {
  const { t } = useTranslation()
  return report.has_screenshot ? (
    <span title={t('admin.bugReports.hasScreenshot')}>
      <Image aria-hidden="true" className="size-4 text-muted" />
      <span className="sr-only">{t('admin.bugReports.hasScreenshot')}</span>
    </span>
  ) : null
}

// /admin/bug-reports (owner only): filters and the page live in the address, like the users list.
export default function AdminBugReportsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const [result, setResult] = useState<Page<BugReportRow> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getBugReports(Object.fromEntries(new URLSearchParams(key)))
      .then((page) => {
        if (active) {
          setResult(page)
          setError('')
        }
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : t('admin.bugReports.loadFailed')))
    return () => {
      active = false
    }
  }, [key, t])

  function apply(next: typeof filters) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
  }

  function change(values: Partial<typeof filters>) {
    apply({ ...filters, ...values, page: '' })
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.bugReports.title')}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('admin.bugReports.intro')}</p>

      <FilterBar
        label={t('admin.common.filters')}
        search={{
          id: 'bug-search',
          label: t('admin.bugReports.search'),
          clearLabel: t('admin.common.clearSearch'),
          value: filters.search,
          onChange: (search) => change({ search }),
        }}
        selects={[
          {
            id: 'bug-status',
            label: t('admin.bugReports.status'),
            value: filters.status,
            onChange: (status) => change({ status }),
            options: [{ value: '', label: t('admin.common.all') }, ...BUG_REPORT_STATUSES.map((value) => ({ value, label: t(`admin.bugReports.statuses.${value}`) }))],
          },
          {
            id: 'bug-seen',
            label: t('admin.bugReports.seen'),
            value: filters.seen,
            onChange: (seen) => change({ seen }),
            options: [
              { value: '', label: t('admin.common.all') },
              { value: 'unseen', label: t('admin.bugReports.unseenOnly') },
              { value: 'seen', label: t('admin.bugReports.seenOnly') },
            ],
          },
          {
            id: 'bug-screenshot',
            label: t('admin.bugReports.screenshot'),
            value: filters.screenshot,
            onChange: (screenshot) => change({ screenshot }),
            options: [
              { value: '', label: t('admin.common.all') },
              { value: '1', label: t('admin.bugReports.withScreenshot') },
              { value: '0', label: t('admin.bugReports.withoutScreenshot') },
            ],
          },
        ]}
        active={Boolean(filters.search || filters.status || filters.seen || filters.screenshot)}
        clearLabel={t('admin.common.clear')}
        onClear={() => apply(EMPTY)}
        meta={result ? t('admin.bugReports.count', { count: result.total, formatted: formatNumber(result.total, 'en') }) : null}
        metaEnd={result && result.last_page > 1 ? t('admin.common.pageOf', { page: result.current_page, pages: result.last_page }) : null}
      />

      {error && (
        <>
          <p role="alert" className={`mt-4 ${alertClass}`}>
            {error}
          </p>
          <ReportProblemButton context={{ message: error }} className={`mt-2 ${secondaryButton}`} />
        </>
      )}
      {!error && result === null && <p className="mt-4 text-muted">{t('admin.bugReports.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.bugReports.empty')}</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          {/* Cards on narrow screens, a table from md up. */}
          <ul className={cardList}>
            {result.data.map((report) => (
              <li key={report.id} className="relative space-y-1.5 px-4 py-3 hover:bg-hover">
                <ReportLink report={report} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <StatusChip status={report.status} />
                  <span title={formatTime(report.created_at)}>{shortDate(report.created_at, t)}</span>
                  <span className="min-w-0 truncate">{reporter(report, t)}</span>
                  <span dir="ltr" className="min-w-0 truncate font-mono">
                    {report.page_path}
                  </span>
                  <ShotIcon report={report} />
                </div>
              </li>
            ))}
          </ul>

          <div className={tableCard}>
            <table className={table}>
              <colgroup>
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-44" />
                <col className="w-40" />
                <col />
                <col className="w-10" />
              </colgroup>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.created')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.status')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.reporter')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.page')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.bugReports.description')}
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">{t('admin.bugReports.screenshot')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((report) => (
                  <tr key={report.id} className={`${row} relative`}>
                    <td className={`${td} text-muted`} title={formatTime(report.created_at)}>
                      {shortDate(report.created_at, t)}
                    </td>
                    <td className={td}>
                      <StatusChip status={report.status} />
                    </td>
                    <td className={td}>
                      <span className={truncate} title={reporter(report, t)}>
                        {reporter(report, t)}
                      </span>
                    </td>
                    <td className={td}>
                      <span dir="ltr" className={`${truncate} font-mono text-xs`} title={report.page_path}>
                        {report.page_path}
                      </span>
                    </td>
                    <td className={td}>
                      <ReportLink report={report} />
                    </td>
                    <td className={td}>
                      <ShotIcon report={report} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={result.current_page} lastPage={result.last_page} total={result.total} onPage={(page) => apply({ ...filters, page: String(page) })} />
        </>
      )}
    </div>
  )
}
