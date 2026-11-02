import type { TFunction } from 'i18next'
import { ArrowRight, Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ApiError, getAuditLog, type AuditEntry, type Page } from '../../api'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import { cardList, headRow, row, table, tableCard, th, truncate } from '../../components/tableStyles'
import { formatNumber } from '../../i18n'
import { dateRangeSummary, groupByUtcDay } from './format'
import UtcClock from './UtcClock'
import { alertClass } from './styles'

const ACTIONS = [
  'module.create', 'module.update', 'module.delete',
  'lesson.create', 'lesson.update', 'lesson.delete',
  'problem.create', 'problem.update', 'problem.delete',
  'test_case.create', 'test_case.update', 'test_case.delete',
  'user.ban', 'user.unban', 'user.logout_everywhere', 'user.role_change',
  'user.points_adjust', 'user.reset_progress', 'user.delete',
]

// Cells start at the top: details can run to several lines.
const tdTop = 'px-3 py-2 align-top'

const EMPTY = { action: '', actor: '', from: '', to: '', page: '' }

// "Role change" for user.role_change; the raw action when there is no label (a new action).
// Actions are "area.verb" (user.role_change); a key per area and verb in admin.auditActions.
const actionLabel = (action: string, t: TFunction) => {
  const [area, verb] = action.split('.')
  return t(`admin.auditActions.${area}.${verb}`, { defaultValue: action })
}

function show(value: unknown, t: TFunction): string {
  if (value === null || value === undefined || value === '') return t('admin.audit.empty')
  return typeof value === 'string' ? value : JSON.stringify(value)
}

type DetailLine = { field: string; old: string; new: string } | { text: string }

// details as readable lines: "title: Old -> New", "body changed", "reason: Spam".
function detailLines(details: AuditEntry['details'], action: string, t: TFunction): DetailLine[] {
  if (!details) return []
  // A single change stored as { old, new } (a role change): one "old -> new" line, named after the
  // action ("role" for user.role_change).
  const { old, new: next, ...rest } = details
  if ('old' in details && 'new' in details)
    return [{ field: action.match(/\.(\w+)_change$/)?.[1].replaceAll('_', ' ') ?? t('admin.audit.value'), old: show(old, t), new: show(next, t) }, ...detailLines(Object.keys(rest).length ? rest : null, action, t)]
  return Object.entries(details).flatMap(([key, value]): DetailLine[] => {
    if (key === 'changes' && value && typeof value === 'object') {
      const changes = Object.entries(value as Record<string, unknown>)
      if (changes.length === 0) return [{ text: t('admin.audit.noFieldsChanged') }]
      return changes.map(([field, change]) => {
        if (change === 'changed') return { text: t('admin.audit.fieldChanged', { field }) }
        const { old, new: next } = change as { old: unknown; new: unknown }
        return { field, old: show(old, t), new: show(next, t) }
      })
    }
    return [{ text: t('admin.audit.detail', { key: key.replaceAll('_', ' '), value: show(value, t) }) }]
  })
}

// Each change as "field: old → new", the old value muted and the new one ink.
function Details({ details, action }: { details: AuditEntry['details']; action: string }) {
  const { t } = useTranslation()
  const lines = detailLines(details, action, t)
  if (lines.length === 0) return <span className="text-muted">-</span>
  return (
    <ul className="space-y-0.5">
      {lines.map((line, index) => (
        <li key={index} className="break-words">
          {'text' in line ? (
            line.text
          ) : (
            <>
              <span className="text-muted">{line.field}: </span>
              <span className="text-muted">{line.old}</span>
              <ArrowRight aria-hidden="true" className="mx-1 inline size-3.5 align-[-0.125em] text-muted" />
              <span className="sr-only"> {t('admin.common.changedTo')} </span>
              <span className="text-ink">{line.new}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

function ActionChip({ action }: { action: string }) {
  const { t } = useTranslation()
  return (
    <span className="flex min-w-0 flex-col items-start gap-0.5">
      <span className="max-w-full truncate rounded border border-line px-1.5 py-0.5 text-xs font-medium text-ink">{actionLabel(action, t)}</span>
      <span className="max-w-full truncate font-mono text-xs text-muted" title={action}>
        {action}
      </span>
    </span>
  )
}

function Actor({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation()
  if (entry.actor_id === null && entry.actor_email === 'console')
    return <span className="inline-block rounded border border-line px-1.5 py-0.5 text-xs font-medium text-muted">{t('admin.audit.consoleActor')}</span>
  return (
    <span title={entry.actor_email} className={`${truncate} text-ink`}>
      {entry.actor_email}
    </span>
  )
}

// The first 8 characters of an id and a button that copies the whole id; "Copied" is announced.
function ShortId({ id }: { id: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function copy() {
    void navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  const label = t('admin.common.copyId', { id })
  return (
    <span className="inline-flex items-center gap-0.5">
      <span title={id} className="font-mono text-xs text-muted">
        <span aria-hidden="true">{id.length > 8 ? `${id.slice(0, 8)}…` : id}</span>
        <span className="sr-only">{id}</span>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={label}
        className="inline-flex size-11 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink sm:pointer-fine:size-7"
      >
        {copied ? <Check aria-hidden="true" className="size-3.5 text-pass" /> : <Copy aria-hidden="true" className="size-3.5" />}
      </button>
      <span role="status" className="sr-only">
        {copied ? t('admin.common.copied') : ''}
      </span>
    </span>
  )
}

function Target({ entry }: { entry: AuditEntry }) {
  if (!entry.target_type && !entry.target_label) return <span className="text-muted">-</span>
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-1.5">
        {entry.target_type && <span className="shrink-0 text-xs text-muted">{entry.target_type.replaceAll('_', ' ')}</span>}
        {entry.target_label && (
          <span title={entry.target_label} className={`${truncate} text-ink`} dir="auto">
            {entry.target_label}
          </span>
        )}
      </div>
      {entry.target_id && <ShortId id={entry.target_id} />}
    </div>
  )
}

// /admin/audit-log, owners only (OwnerRoute). Read-only: rows can't be edited or deleted.
export default function AdminAuditLogPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const [result, setResult] = useState<Page<AuditEntry> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAuditLog(Object.fromEntries(new URLSearchParams(key)))
      .then((page) => {
        if (active) {
          setResult(page)
          setError('')
        }
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : t('admin.audit.loadFailed')))
    return () => {
      active = false
    }
  }, [key, t])

  function apply(next: typeof filters) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
  }

  // A changed filter goes back to the first page, as the Filter button did.
  function change(values: Partial<typeof filters>) {
    apply({ ...filters, ...values, page: '' })
  }

  const groups = result ? groupByUtcDay(result.data, t) : []

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.audit.title')}</h1>
      <p className="mt-2 text-muted">{t('admin.audit.intro')}</p>

      <FilterBar
        label={t('admin.common.filters')}
        search={{
          id: 'audit-actor',
          label: t('admin.audit.actorFilter'),
          clearLabel: t('admin.common.clearSearch'),
          value: filters.actor,
          onChange: (actor) => change({ actor }),
        }}
        selects={[
          {
            id: 'audit-action',
            label: t('admin.audit.action'),
            value: filters.action,
            onChange: (action) => change({ action }),
            options: [{ value: '', label: t('admin.common.all') }, ...ACTIONS.map((value) => ({ value, label: actionLabel(value, t) }))],
          },
        ]}
        date={{
          label: t('admin.common.date'),
          fromLabel: t('admin.common.from'),
          toLabel: t('admin.common.to'),
          from: filters.from,
          to: filters.to,
          summary: dateRangeSummary(filters.from, filters.to, t),
          onChange: (from, to) => change({ from, to }),
        }}
        active={Boolean(filters.actor || filters.action || filters.from || filters.to)}
        clearLabel={t('admin.common.clear')}
        onClear={() => apply(EMPTY)}
        meta={result ? t('admin.common.results', { count: result.total, formatted: formatNumber(result.total, 'en') }) : null}
        metaEnd={result && result.last_page > 1 ? t('admin.common.pageOf', { page: result.current_page, pages: result.last_page }) : null}
      />

      {error && (
        <p role="alert" className={`mt-4 ${alertClass}`}>
          {error}
        </p>
      )}
      {!error && result === null && <p className="mt-4 text-muted">{t('admin.audit.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.audit.noMatch')}</p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          {/* Six columns need more room than a tablet has: cards up to lg, the table from lg. */}
          <div className={cn(cardList, 'md:block lg:hidden')}>
            {groups.map((group) => (
              <section key={group.day} aria-label={group.heading}>
                <h2 className="bg-hover/60 px-4 py-1.5 text-xs font-medium text-muted">{group.heading}</h2>
                <ul className="divide-y divide-line border-t border-line">
                  {group.rows.map((entry) => (
                    <li key={entry.id} className="space-y-2 px-4 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <ActionChip action={entry.action} />
                        <UtcClock iso={entry.created_at} />
                      </div>
                      <Target entry={entry} />
                      <Details details={entry.details} action={entry.action} />
                      <div className="flex min-w-0 items-center gap-2 text-xs">
                        <span className="min-w-0">
                          <Actor entry={entry} />
                        </span>
                        <span aria-hidden="true" className="text-muted">·</span>
                        <span className="shrink-0 font-mono text-muted">{entry.ip ?? t('admin.common.noIp')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className={cn(tableCard, 'md:hidden lg:block')}>
            <table className={table}>
              <colgroup>
                <col className="w-28" />
                <col className="w-60" />
                <col className="w-44" />
                <col className="w-56" />
                <col />
                <col className="w-28" />
              </colgroup>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={th}>
                    {t('admin.common.time')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.audit.actor')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.audit.action')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.audit.targetColumn')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.audit.details')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.common.ip')}
                  </th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.day}>
                  <tr className="border-b border-line bg-hover/40">
                    <th scope="colgroup" colSpan={6} className="px-3 py-1.5 text-xs font-medium text-muted">
                      {group.heading}
                    </th>
                  </tr>
                  {group.rows.map((entry) => (
                    <tr key={entry.id} className={row}>
                      <td className={tdTop}>
                        <UtcClock iso={entry.created_at} />
                      </td>
                      <td className={`${tdTop}`}>
                        <Actor entry={entry} />
                      </td>
                      <td className={`${tdTop}`}>
                        <ActionChip action={entry.action} />
                      </td>
                      <td className={`${tdTop}`}>
                        <Target entry={entry} />
                      </td>
                      <td className={`${tdTop}`}>
                        <Details details={entry.details} action={entry.action} />
                      </td>
                      <td className={`${tdTop} font-mono text-xs text-muted`}>
                        <span title={entry.ip ?? undefined} className={truncate}>
                          {entry.ip ?? '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <Pagination
            page={result.current_page}
            lastPage={result.last_page}
            total={result.total}
            onPage={(page) => apply({ ...filters, page: String(page) })}
          />
        </>
      )}
    </div>
  )
}
