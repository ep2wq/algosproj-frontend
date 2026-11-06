import { Bot, ChevronDown, Crosshair, Gauge, KeyRound, Lock, ShieldX, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  banIp,
  getBannedIps,
  getSecurityEvents,
  markAllSecurityEventsSeen,
  markSecurityEventSeen,
  unbanIp,
  type BanDuration,
  type BannedIp,
  type Page,
  type SecurityEvent,
  type SecurityEventType,
} from '../../api'
import ReportProblemButton from '../../components/ReportProblemButton'
import FilterBar from '../../components/FilterBar'
import Pagination from '../../components/Pagination'
import { cardList, headRow, num, row, rowLink, table, tableCard, td, th, truncate } from '../../components/tableStyles'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumber } from '../../i18n'
import { browserLabel, formatTime, groupByUtcDay } from './format'
import { SECURITY_CHANGED } from './AdminNav'
import UtcClock from './UtcClock'
import { alertClass, primaryButton, secondaryButton, selectClass } from './styles'

const TYPES: SecurityEventType[] = [
  'forbidden_admin_route',
  'unauthenticated_admin_route',
  'honeypot_filled',
  'decoy_url',
  'suspicious_input',
  'rate_limited',
  'csrf_mismatch',
]
const DURATIONS: BanDuration[] = ['1h', '24h', '7d', 'permanent']
const EMPTY = { tab: '', type: '', status: '', ip: '', page: '' }

// Each type as a chip with an icon and its words, never colour alone: attempts at something
// forbidden or a bot in fail, the noisier everyday ones muted.
const FAIL = 'border-fail/40 bg-fail/10 text-fail'
const MUTED = 'border-line text-muted'
const TYPE_STYLE: Record<SecurityEventType, [LucideIcon, string]> = {
  forbidden_admin_route: [ShieldX, FAIL],
  unauthenticated_admin_route: [Lock, MUTED],
  honeypot_filled: [Bot, FAIL],
  decoy_url: [Crosshair, FAIL],
  suspicious_input: [TriangleAlert, FAIL],
  rate_limited: [Gauge, MUTED],
  csrf_mismatch: [KeyRound, MUTED],
}

const smallButton = `${secondaryButton} disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60`
const dangerButton =
  'min-h-11 rounded bg-fail px-4 font-medium text-inverse hover:bg-fail/90 disabled:cursor-not-allowed disabled:opacity-60'

function TypeChip({ type }: { type: SecurityEventType }) {
  const { t } = useTranslation()
  const [Icon, style] = TYPE_STYLE[type] ?? [TriangleAlert, MUTED]
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${style}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{t(`admin.security.types.${type}`, { defaultValue: type })}</span>
    </span>
  )
}

function NewChip() {
  const { t } = useTranslation()
  return <span className="inline-flex shrink-0 items-center rounded border border-accent/50 px-1.5 py-0.5 text-xs font-medium text-accent">{t('admin.security.new')}</span>
}

// A date and time in UTC ("2026-11-05 14:03 UTC"), local time in the title.
function UtcDateTime({ iso }: { iso: string }) {
  const { t } = useTranslation()
  return (
    <time dateTime={iso} title={t('admin.common.localTime', { time: formatTime(iso) })} className="font-mono text-xs whitespace-nowrap tabular-nums">
      {new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} <span className="font-sans text-[0.6875rem] tracking-wide">{t('admin.common.utc')}</span>
    </time>
  )
}

function Account({ event }: { event: SecurityEvent }) {
  const { t } = useTranslation()
  if (!event.user) return <span className="text-muted">{t('admin.security.noAccount')}</span>
  return (
    // 44 px tall on touch screens, like the buttons; the email itself stays on one line.
    <Link to={`/admin/users/${event.user.id}`} title={event.user.email} className={`${rowLink} flex min-h-11 min-w-0 items-center sm:pointer-fine:min-h-0`}>
      <span className={truncate}>{event.user.email}</span>
    </Link>
  )
}

function Request({ event }: { event: SecurityEvent }) {
  return (
    <span title={`${event.method} ${event.path}`} className={`${truncate} font-mono text-xs`}>
      <span className="text-muted">{event.method}</span> {event.path}
    </span>
  )
}

// The expandable part of a row: browser, first seen and the stored details.
function Details({ event, id }: { event: SecurityEvent; id: string }) {
  const { t } = useTranslation()
  const detail = event.detail ?? {}
  const items: [string, ReactNode][] = [
    [
      t('admin.security.browser'),
      event.user_agent ? (
        <span key="browser" className="flex flex-col">
          <span>{browserLabel(event.user_agent) ?? t('admin.common.unknown')}</span>
          <span className="font-mono text-xs break-all text-muted">{event.user_agent}</span>
        </span>
      ) : (
        t('admin.common.noBrowser')
      ),
    ],
    [t('admin.security.firstSeen'), <UtcDateTime key="first" iso={event.first_seen_at} />],
  ]
  if (detail.route) items.push([t('admin.security.route'), <code key="route" className="font-mono text-xs break-all">{detail.route}</code>])
  if (detail.required) items.push([t('admin.security.requiredRole'), t(`admin.roles.${detail.required}`, { defaultValue: detail.required })])
  if (detail.rule) items.push([t('admin.security.rule'), t(`admin.security.rules.${detail.rule}`, { defaultValue: detail.rule })])
  if (detail.fields?.length) items.push([t('admin.security.fields'), <code key="fields" className="font-mono text-xs break-all">{detail.fields.join(', ')}</code>])
  if (detail.value) items.push([t('admin.security.value'), <code key="value" className="block rounded bg-code px-2 py-1 font-mono text-xs break-all whitespace-pre-wrap">{detail.value}</code>])

  return (
    <dl id={id} className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[10rem_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function DetailsToggle({ open, controls, onToggle }: { open: boolean; controls: string; onToggle: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" aria-expanded={open} aria-controls={controls} onClick={onToggle} className={`${smallButton} gap-1`}>
      {t('admin.security.details')}
      <ChevronDown aria-hidden="true" className={`size-4 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

// A native modal dialog (showModal): focus moves into it and stays there, Escape closes it, the
// page behind is inert, and focus goes back to the button that opened it. Not Base UI's dialog: it
// changed the shared chunks and added JavaScript to the landing page.
function Modal({ open, onClose, title, intro, children }: { open: boolean; onClose: () => void; title: string; intro: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  // A layout effect: the dialog closes (and gives focus back) before announce() moves focus on.
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-line bg-surface p-4 text-ink backdrop:bg-black/50"
    >
      {open && (
        <div className="grid gap-4">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          <p id={`${id}-intro`} className="text-sm text-muted">
            {intro}
          </p>
          {children}
        </div>
      )}
    </dialog>
  )
}

// The ban form in a dialog: duration, an optional note and the shared-network warning. Focus stays
// in the dialog and goes back to the button when it closes. A button whose IP is already banned is
// aria-disabled (it keeps focus) and does not open.
function BanDialog({ ip, banned, onBanned }: { ip: string; banned: boolean; onBanned: (ip: string, duration: BanDuration) => void }) {
  const { t } = useTranslation()
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState<BanDuration>('24h')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setOpen(false)
    setError('')
    setNote('')
    setDuration('24h')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await banIp(ip, duration, note.trim())
      close()
      onBanned(ip, duration)
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldMessages = Object.values(err.fieldErrors).flat()
        setError(fieldMessages.length > 0 ? fieldMessages.join(' ') : err.message)
      } else {
        setError(t('admin.common.genericError'))
      }
    }
    setBusy(false)
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-disabled={banned || undefined} onClick={() => !banned && setOpen(true)} className={smallButton}>
        {banned ? t('admin.security.ipBanned') : t('admin.security.banIp')}
      </button>
      <Modal
        open={open}
        onClose={close}
        title={t('admin.security.banTitle')}
        intro={
          <>
            {t('admin.security.banIntro')} <span className="font-mono text-ink">{ip}</span>
          </>
        }
      >
        <p className="flex gap-2 rounded border border-fail/30 bg-fail/5 px-3 py-2 text-sm text-ink">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fail" />
          <span>{t('admin.security.sharedWarning')}</span>
        </p>
        <form id={formId} onSubmit={submit} noValidate className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">{t('admin.security.duration')}</legend>
            <div className="mt-1 grid grid-cols-2 gap-x-4">
              {DURATIONS.map((value) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-sm sm:pointer-fine:min-h-8">
                  <input type="radio" name={`${formId}-duration`} value={value} checked={duration === value} onChange={() => setDuration(value)} className="size-4 accent-accent" />
                  {t(`admin.security.durations.${value}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={`${formId}-note`} className="text-sm font-medium">
              {t('admin.security.note')}
            </label>
            <input id={`${formId}-note`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={255} className={`${selectClass} border-field`} />
          </div>
          {error && (
            <p role="alert" className={`${alertClass} text-sm`}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={dangerButton}>
              {busy ? t('admin.common.working') : t('admin.security.banConfirm')}
            </button>
            <button type="button" onClick={close} disabled={busy} className={secondaryButton}>
              {t('admin.common.cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function UnbanDialog({ ban, onUnbanned }: { ban: BannedIp; onUnbanned: (ip: string) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setOpen(false)
    setError('')
  }

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await unbanIp(ban.id)
      close()
      onUnbanned(ban.ip)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.common.genericError'))
    }
    setBusy(false)
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={smallButton}>
        {t('admin.security.unban')}
      </button>
      <Modal
        open={open}
        onClose={close}
        title={t('admin.security.unbanTitle')}
        intro={
          <>
            {t('admin.security.unbanIntro')} <span className="font-mono text-ink">{ban.ip}</span>
          </>
        }
      >
        {error && (
          <p role="alert" className={`${alertClass} text-sm`}>
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={confirm} disabled={busy} className={primaryButton}>
            {busy ? t('admin.common.working') : t('admin.security.unbanConfirm')}
          </button>
          <button type="button" onClick={close} disabled={busy} className={secondaryButton}>
            {t('admin.common.cancel')}
          </button>
        </div>
      </Modal>
    </>
  )
}

function useLoad<T>(load: () => Promise<T>, key: string, failed: string) {
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const latest = useRef(load)
  useEffect(() => {
    latest.current = load
  })
  useEffect(() => {
    let active = true
    latest.current()
      .then((value) => {
        if (active) {
          setResult(value)
          setError('')
        }
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : failed))
    return () => {
      active = false
    }
  }, [key, version, failed])
  return { result, setResult, error, reload: () => setVersion((v) => v + 1) }
}

function EventsTab({ filters, apply, announce }: { filters: typeof EMPTY; apply: (next: typeof EMPTY) => void; announce: (message: string) => void }) {
  const { t } = useTranslation()
  const query = { type: filters.type, status: filters.status, ip: filters.ip, page: filters.page }
  const { result, setResult, error, reload } = useLoad<Page<SecurityEvent>>(() => getSecurityEvents(query), JSON.stringify(query), t('admin.security.loadFailed'))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const baseId = useId()

  const change = (values: Partial<typeof EMPTY>) => apply({ ...filters, ...values, page: '' })
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  async function seen(event: SecurityEvent) {
    try {
      const { seen_at } = await markSecurityEventSeen(event.id)
      setResult((page) => page && { ...page, data: page.data.map((item) => (item.id === event.id ? { ...item, seen_at } : item)) })
      window.dispatchEvent(new Event(SECURITY_CHANGED))
      announce(t('admin.security.markedSeen'))
    } catch (err) {
      announce(err instanceof ApiError ? err.message : t('admin.common.genericError'))
    }
  }

  async function allSeen() {
    setBusy(true)
    try {
      const { updated } = await markAllSecurityEventsSeen()
      window.dispatchEvent(new Event(SECURITY_CHANGED))
      announce(t('admin.security.markedAllSeen', { count: updated, formatted: formatNumber(updated, 'en') }))
      reload()
    } catch (err) {
      announce(err instanceof ApiError ? err.message : t('admin.common.genericError'))
    }
    setBusy(false)
  }

  function banned(ip: string, duration: BanDuration) {
    announce(t('admin.security.bannedMessage', { ip, duration: t(`admin.security.durations.${duration}`) }))
    reload()
  }

  // Grouped by the UTC day it was last seen, the order of the list.
  const groups = result ? groupByUtcDay(result.data.map((event) => ({ ...event, created_at: event.last_seen_at })), t) : []
  const hasUnseen = result?.data.some((event) => event.seen_at === null) ?? false

  const actions = (event: SecurityEvent, detailsId: string) => (
    <div className="flex flex-wrap gap-1.5">
      <DetailsToggle open={expanded.has(event.id)} controls={detailsId} onToggle={() => toggle(event.id)} />
      {event.seen_at === null && (
        <button type="button" onClick={() => seen(event)} className={smallButton}>
          {t('admin.security.markSeen')}
        </button>
      )}
      <BanDialog ip={event.ip} banned={event.ip_banned} onBanned={banned} />
    </div>
  )

  return (
    <>
      <FilterBar
        label={t('admin.common.filters')}
        search={{ id: 'security-ip', label: t('admin.security.ipFilter'), clearLabel: t('admin.common.clearSearch'), value: filters.ip, onChange: (ip) => change({ ip: ip.trim() }) }}
        selects={[
          {
            id: 'security-type',
            label: t('admin.security.type'),
            value: filters.type,
            onChange: (type) => change({ type }),
            options: [{ value: '', label: t('admin.common.all') }, ...TYPES.map((value) => ({ value, label: t(`admin.security.types.${value}`) }))],
          },
          {
            id: 'security-status',
            label: t('admin.security.show'),
            value: filters.status,
            onChange: (status) => change({ status }),
            options: [
              { value: '', label: t('admin.security.allEvents') },
              { value: 'unseen', label: t('admin.security.unseenOnly') },
            ],
          },
        ]}
        active={Boolean(filters.type || filters.status || filters.ip)}
        clearLabel={t('admin.common.clear')}
        onClear={() => apply({ ...EMPTY })}
        meta={result ? t('admin.common.results', { count: result.total, formatted: formatNumber(result.total, 'en') }) : null}
        metaEnd={result && result.last_page > 1 ? t('admin.common.pageOf', { page: result.current_page, pages: result.last_page }) : null}
      />

      {hasUnseen && (
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={allSeen} disabled={busy} className={smallButton}>
            {busy ? t('admin.common.working') : t('admin.security.markAllSeen')}
          </button>
        </div>
      )}

      {error && (
        <>
          <p role="alert" className={`mt-4 ${alertClass}`}>
            {error}
          </p>
          <ReportProblemButton context={{ message: error }} className={`mt-2 ${secondaryButton}`} />
        </>
      )}
      {!error && result === null && <p className="mt-4 text-muted">{t('admin.security.loading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">
          {filters.type || filters.status || filters.ip ? t('admin.security.noMatch') : t('admin.security.noEvents')}
        </p>
      )}

      {result !== null && result.data.length > 0 && (
        <>
          <div className={cardList}>
            {groups.map((group) => (
              <section key={group.day} aria-label={group.heading}>
                <h3 className="bg-hover/60 px-4 py-1.5 text-xs font-medium text-muted">{group.heading}</h3>
                <ul className="divide-y divide-line border-t border-line">
                  {group.rows.map((event) => {
                    const detailsId = `${baseId}-card-${event.id}`
                    return (
                      <li key={event.id} className="space-y-1.5 px-4 py-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <TypeChip type={event.type} />
                            {event.seen_at === null && <NewChip />}
                          </span>
                          <span className="shrink-0">
                            <UtcClock iso={event.last_seen_at} />
                          </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2 text-xs">
                          <span className="shrink-0 font-mono">{event.ip}</span>
                          <span aria-hidden="true" className="text-muted">·</span>
                          <span className="text-muted">{t('admin.security.times', { count: event.count, formatted: formatNumber(event.count, 'en') })}</span>
                        </div>
                        <Request event={event} />
                        <Account event={event} />
                        {actions(event, detailsId)}
                        {expanded.has(event.id) && (
                          <div className="pt-1">
                            <Details event={event} id={detailsId} />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className={tableCard}>
            <table className={table}>
              <colgroup>
                <col className="w-28" />
                <col className="w-56" />
                <col className="w-36" />
                <col className="w-16" />
                <col />
                <col className="w-44" />
                <col className="w-60" />
              </colgroup>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={th}>
                    {t('admin.security.lastSeen')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.type')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.common.ip')}
                  </th>
                  <th scope="col" className={`${th} text-end`}>
                    {t('admin.security.count')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.request')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.account')}
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">{t('admin.security.actions')}</span>
                  </th>
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.day}>
                  <tr className="border-b border-line bg-hover/40">
                    <th scope="colgroup" colSpan={7} className="px-3 py-1.5 text-xs font-medium text-muted">
                      {group.heading}
                    </th>
                  </tr>
                  {group.rows.map((event) => {
                    const detailsId = `${baseId}-row-${event.id}`
                    return (
                      <SecurityRows key={event.id} event={event} detailsId={detailsId} open={expanded.has(event.id)} actions={actions(event, detailsId)} />
                    )
                  })}
                </tbody>
              ))}
            </table>
          </div>

          <Pagination page={result.current_page} lastPage={result.last_page} total={result.total} onPage={(page) => apply({ ...filters, page: String(page) })} />
        </>
      )}
    </>
  )
}

function SecurityRows({ event, detailsId, open, actions }: { event: SecurityEvent; detailsId: string; open: boolean; actions: ReactNode }) {
  const { t } = useTranslation()
  return (
    <>
      <tr className={open ? 'h-11 hover:bg-hover' : row}>
        <td className={td}>
          <UtcClock iso={event.last_seen_at} />
        </td>
        <td className={td}>
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <TypeChip type={event.type} />
            {event.seen_at === null && <NewChip />}
          </span>
        </td>
        <td className={`${td} font-mono text-xs`}>
          <span title={event.ip} className={truncate}>
            {event.ip}
          </span>
        </td>
        <td className={`${td} ${num}`}>
          <span className="sr-only">{t('admin.security.times', { count: event.count, formatted: formatNumber(event.count, 'en') })}</span>
          <span aria-hidden="true">{formatNumber(event.count, 'en')}</span>
        </td>
        <td className={td}>
          <Request event={event} />
        </td>
        <td className={td}>
          <Account event={event} />
        </td>
        <td className={td}>{actions}</td>
      </tr>
      {open && (
        <tr className="border-b border-line last:border-b-0">
          <td colSpan={7} className="bg-hover/30 px-3 pt-1 pb-3">
            <Details event={event} id={detailsId} />
          </td>
        </tr>
      )}
    </>
  )
}

function Expires({ ban }: { ban: BannedIp }) {
  const { t } = useTranslation()
  if (ban.expires_at === null) return <span>{t('admin.security.never')}</span>
  return (
    <span className={ban.active ? '' : 'text-muted'}>
      {!ban.active && <span className="me-1 rounded border border-line px-1 py-0.5 text-xs">{t('admin.security.expired')}</span>}
      <UtcDateTime iso={ban.expires_at} />
    </span>
  )
}

function Blocked({ ban }: { ban: BannedIp }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-col">
      <span className="tabular-nums">{t('admin.security.blockedCount', { count: ban.blocked_count, formatted: formatNumber(ban.blocked_count, 'en') })}</span>
      {ban.last_blocked_at && (
        <span className="text-xs text-muted">
          {t('admin.security.lastBlocked')} <UtcDateTime iso={ban.last_blocked_at} />
        </span>
      )}
    </span>
  )
}

function BansTab({ page, apply, announce }: { page: string; apply: (page: string) => void; announce: (message: string) => void }) {
  const { t } = useTranslation()
  const { result, error, reload } = useLoad<Page<BannedIp>>(() => getBannedIps(page), page, t('admin.security.bansLoadFailed'))

  function unbanned(ip: string) {
    announce(t('admin.security.unbannedMessage', { ip }))
    reload()
  }

  const by = (ban: BannedIp) => ban.banned_by_user?.email ?? t('admin.common.unknown')

  return (
    <>
      <p className="mt-6 max-w-prose text-sm text-muted">{t('admin.security.bansIntro')}</p>
      {error && (
        <>
          <p role="alert" className={`mt-4 ${alertClass}`}>
            {error}
          </p>
          <ReportProblemButton context={{ message: error }} className={`mt-2 ${secondaryButton}`} />
        </>
      )}
      {!error && result === null && <p className="mt-4 text-muted">{t('admin.security.bansLoading')}</p>}
      {result !== null && result.data.length === 0 && (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.security.noBans')}</p>
      )}
      {result !== null && result.data.length > 0 && (
        <>
          <ul className={cardList}>
            {result.data.map((ban) => (
              <li key={ban.id} className="space-y-1.5 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{ban.ip}</span>
                  <UnbanDialog ban={ban} onUnbanned={unbanned} />
                </div>
                <div className="text-xs text-muted">
                  {t('admin.security.since')} <UtcDateTime iso={ban.created_at} />
                </div>
                <div className="text-xs">
                  <span className="text-muted">{t('admin.security.expires')}</span> <Expires ban={ban} />
                </div>
                {ban.note && <p className="break-words">{ban.note}</p>}
                <p className={`${truncate} text-xs text-muted`}>{t('admin.security.bannedBy', { email: by(ban) })}</p>
                <Blocked ban={ban} />
              </li>
            ))}
          </ul>

          <div className={tableCard}>
            <table className={table}>
              <colgroup>
                <col className="w-40" />
                <col className="w-40" />
                <col className="w-48" />
                <col />
                <col className="w-44" />
                <col className="w-48" />
                <col className="w-28" />
              </colgroup>
              <thead className={headRow}>
                <tr>
                  <th scope="col" className={th}>
                    {t('admin.common.ip')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.since')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.expires')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.noteColumn')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.bannedByColumn')}
                  </th>
                  <th scope="col" className={th}>
                    {t('admin.security.blocked')}
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">{t('admin.security.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((ban) => (
                  <tr key={ban.id} className={row}>
                    <td className={`${td} font-mono text-xs`}>
                      <span title={ban.ip} className={truncate}>
                        {ban.ip}
                      </span>
                    </td>
                    <td className={td}>
                      <UtcDateTime iso={ban.created_at} />
                    </td>
                    <td className={td}>
                      <Expires ban={ban} />
                    </td>
                    <td className={td}>{ban.note ? <span className="break-words">{ban.note}</span> : <span className="text-muted">-</span>}</td>
                    <td className={td}>
                      <span title={by(ban)} className={truncate}>
                        {by(ban)}
                      </span>
                    </td>
                    <td className={td}>
                      <Blocked ban={ban} />
                    </td>
                    <td className={td}>
                      <UnbanDialog ban={ban} onUnbanned={unbanned} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={result.current_page} lastPage={result.last_page} total={result.total} onPage={(next) => apply(String(next))} />
        </>
      )}
    </>
  )
}

// /admin/security, owners only (OwnerRoute): forbidden or suspicious requests and IP bans
// (backend README "Security events and IP bans"). The tab and the filters are in the URL.
export default function AdminSecurityPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const filters = { ...EMPTY, ...Object.fromEntries(params) }
  const tab = filters.tab === 'bans' ? 'bans' : 'events'
  const [message, setMessage] = useState('')
  const statusRef = useRef<HTMLParagraphElement>(null)

  function apply(next: typeof EMPTY) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
  }

  // After an action whose button may be gone (seen, unban), focus goes to the result line. In an
  // effect, so it runs after the commit that closed the dialog (a modal makes the page inert).
  const [announced, setAnnounced] = useState(0)
  useEffect(() => {
    if (announced) statusRef.current?.focus()
  }, [announced])
  function announce(text: string) {
    setMessage(text)
    setAnnounced((n) => n + 1)
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('admin.security.title')}</h1>
      <p className="mt-2 max-w-prose text-muted">{t('admin.security.intro')}</p>
      <p ref={statusRef} role="status" tabIndex={-1} className={message ? 'mt-4 rounded border border-line bg-surface px-3 py-2 text-sm' : 'sr-only'}>
        {message}
      </p>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setMessage('')
          apply({ ...EMPTY, tab: value === 'bans' ? 'bans' : '' })
        }}
        className="mt-6"
      >
        <TabsList activateOnFocus>
          <TabsTrigger value="events">{t('admin.security.eventsTab')}</TabsTrigger>
          <TabsTrigger value="bans">{t('admin.security.bansTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="events" tabIndex={0}>
          {tab === 'events' && <EventsTab filters={filters} apply={apply} announce={announce} />}
        </TabsContent>
        <TabsContent value="bans" tabIndex={0}>
          {tab === 'bans' && <BansTab page={filters.page} apply={(page) => apply({ ...EMPTY, tab: 'bans', page })} announce={announce} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
