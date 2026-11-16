import { CalendarDays, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SEARCH_ATTRIBUTE } from '../shortcuts'

// One line of filters on a surface card (admin lists and Challenges): a search field, a chip per
// select, an optional date-range chip with a small popover, extra controls, and "Clear" while
// something is applied. Text and dates apply 300 ms after the last change (Enter applies the search
// at once); selects apply on change. All text comes from props, so it works in English and Arabic.
// Logical classes only, so it follows the page's direction. Only the first MAX_VISIBLE filters show;
// the rest sit behind a "More filters" chip (open on its own while one of them is applied). The search
// field carries data-search-input, which the "/" shortcut looks for (src/shortcuts.ts).

const DEBOUNCE_MS = 300
const MAX_VISIBLE = 4

// A chip: 44 px on touch screens, 32 px with a mouse from sm. An applied filter gets the accent border.
const chipClass = (active: boolean) =>
  `elev-raised relative inline-flex min-h-11 items-center gap-1 rounded border bg-surface text-sm text-ink hover:border-muted sm:pointer-fine:min-h-8 ${active ? 'border-accent' : 'border-field'}`

export type SelectFilter = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; lang?: string }[]
}

export type DateFilter = {
  label: string
  fromLabel: string
  toLabel: string
  from: string
  to: string
  // The chip's text: "All" when empty, otherwise the range ("Nov 1 – Nov 2").
  summary: string
  onChange: (from: string, to: string) => void
}

// Calls apply(value) DEBOUNCE_MS after the last change of value, unless it is already applied.
function useDebounced(value: string, applied: string, apply: (value: string) => void) {
  const latest = useRef({ applied, apply })
  useEffect(() => {
    latest.current = { applied, apply }
  })
  useEffect(() => {
    if (value === latest.current.applied) return
    const timer = window.setTimeout(() => latest.current.apply(value), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [value])
}

// A field typed into locally and applied after a pause; it takes the applied value again when that
// changes from outside (Clear, Back), but not when it is what this field just sent (the user may
// have typed on since).
function useDraft(applied: string, sent?: string) {
  const [draft, setDraft] = useState(applied)
  const [seen, setSeen] = useState(applied)
  if (seen !== applied) {
    setSeen(applied)
    if (applied !== sent) setDraft(applied)
  }
  return [draft, setDraft] as const
}

function SearchField({
  id,
  label,
  clearLabel,
  value,
  onChange,
}: {
  id: string
  label: string
  clearLabel: string
  value: string
  onChange: (value: string) => void
}) {
  const [sent, setSent] = useState(value)
  const [draft, setDraft] = useDraft(value, sent)
  const input = useRef<HTMLInputElement>(null)
  useDebounced(draft, value, send)

  function send(next: string) {
    setSent(next)
    onChange(next)
  }

  function clear() {
    setDraft('')
    send('')
  }

  return (
    <div className="relative min-w-0 flex-1 basis-56">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        id={id}
        {...{ [SEARCH_ATTRIBUTE]: '' }}
        type="text"
        value={draft}
        placeholder={label}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            send(draft)
          } else if (event.key === 'Escape' && draft) {
            event.preventDefault()
            clear()
          }
        }}
        className={`block min-h-11 w-full rounded border bg-surface ps-8 pe-11 text-sm text-ink hover:border-muted sm:pointer-fine:min-h-8 sm:pointer-fine:pe-8 ${value ? 'border-accent' : 'border-field'}`}
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            clear()
            input.current?.focus()
          }}
          aria-label={clearLabel}
          title={clearLabel}
          className="absolute end-0 top-0 inline-flex size-11 items-center justify-center rounded text-muted hover:text-ink sm:pointer-fine:size-8"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  )
}

// A native select drawn as a chip: "Role: All". The label names the select for screen readers too.
function SelectChip({ filter }: { filter: SelectFilter }) {
  return (
    <div className={`${chipClass(filter.value !== '')} max-w-full ps-2.5`}>
      <label htmlFor={filter.id} className="shrink-0 text-muted">
        {filter.label}:
      </label>
      {/* The select covers the chip's text and arrow, so the whole chip opens it. */}
      <select
        id={filter.id}
        value={filter.value}
        onChange={(event) => filter.onChange(event.target.value)}
        className="min-h-11 max-w-56 min-w-0 cursor-pointer appearance-none truncate rounded bg-surface pe-7 text-ink font-medium field-sizing-content sm:pointer-fine:min-h-8"
      >
        {filter.options.map((option) => (
          <option key={option.value} value={option.value} lang={option.lang} dir={option.lang ? 'auto' : undefined}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-2 size-4 text-muted" />
    </div>
  )
}

// "Date: Nov 1 – Nov 2": a button that opens the From and To date inputs under it. A disclosure, not
// a dialog: Escape or a click outside closes it and Escape returns focus to the chip. The panel
// hangs from the bar's end edge, so it stays on screen wherever the chip wraps to.
function DateChip({ filter }: { filter: DateFilter }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useDraft(filter.from)
  const [to, setTo] = useDraft(filter.to)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const key = `${from}|${to}`
  useDebounced(key, `${filter.from}|${filter.to}`, () => filter.onChange(from, to))
  const panel = useRef<HTMLDivElement>(null)

  // Opening moves focus to the From field; Escape (below) puts it back on the chip.
  useEffect(() => {
    if (open && !panel.current?.contains(document.activeElement)) panel.current?.querySelector<HTMLElement>('input')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function onBlur(event: FocusEvent) {
    if (event.relatedTarget && !wrapper.current?.contains(event.relatedTarget)) setOpen(false)
  }

  const active = Boolean(filter.from || filter.to)
  const inputClass = 'mt-1 block w-full rounded border border-field bg-surface px-2 py-1.5 text-sm text-ink hover:border-muted'
  return (
    <div ref={wrapper} onBlur={onBlur}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`${chipClass(active)} px-2.5`}
      >
        <CalendarDays aria-hidden="true" className="size-4 text-muted" />
        <span className="text-muted">{filter.label}:</span>
        <span className="font-medium whitespace-nowrap tabular-nums">{filter.summary}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </button>
      <div
        ref={panel}
        id={panelId}
        data-open={open ? '' : undefined}
        className="disclosure-panel elev-floating absolute end-2 top-full z-20 mt-1 w-80 max-w-[calc(100%-1rem)] p-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${panelId}-from`} className="text-sm font-medium">
              {filter.fromLabel}
            </label>
            <input id={`${panelId}-from`} type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor={`${panelId}-to`} className="text-sm font-medium">
              {filter.toLabel}
            </label>
            <input id={`${panelId}-to`} type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FilterBar({
  label,
  search,
  selects = [],
  date,
  extra,
  active,
  clearLabel,
  onClear,
  meta,
  metaEnd,
}: {
  // The name of the filters region ("Filters").
  label: string
  search?: { id: string; label: string; clearLabel: string; value: string; onChange: (value: string) => void }
  selects?: SelectFilter[]
  date?: DateFilter
  // More controls on the same line (the content page's toggle and expand buttons).
  extra?: ReactNode
  active: boolean
  clearLabel: string
  onClear: () => void
  // Under the bar: the result count at the start, page info at the end.
  meta?: ReactNode
  metaEnd?: ReactNode
}) {
  const { t } = useTranslation()
  // The filters in order (the selects, then the date), the first MAX_VISIBLE in the bar.
  const filters = [...selects.map((filter) => ({ id: filter.id, active: filter.value !== '', node: <SelectChip filter={filter} /> })), ...(date ? [{ id: 'date', active: Boolean(date.from || date.to), node: <DateChip filter={date} /> }] : [])]
  const rest = filters.slice(MAX_VISIBLE)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreShown = moreOpen || rest.some((filter) => filter.active)

  return (
    <div className="mt-6">
      <div role="search" aria-label={label} className="relative flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-2">
        {search && <SearchField {...search} />}
        {filters.slice(0, MAX_VISIBLE).map((filter) => (
          <div key={filter.id} className="contents">
            {filter.node}
          </div>
        ))}
        {rest.length > 0 && (
          <button type="button" aria-expanded={moreShown} onClick={() => setMoreOpen(!moreShown)} className={`${chipClass(rest.some((filter) => filter.active))} px-2.5`}>
            {t('filters.more')}
            <ChevronDown aria-hidden="true" className={`size-4 text-muted motion-safe:transition-transform motion-safe:duration-(--dur-ui) ${moreShown ? 'rotate-180' : ''}`} />
          </button>
        )}
        {moreShown &&
          rest.map((filter) => (
            <div key={filter.id} className="contents">
              {filter.node}
            </div>
          ))}
        {extra}
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center rounded px-2 text-sm font-medium text-accent-text underline-offset-4 hover:underline sm:pointer-fine:min-h-8"
          >
            {clearLabel}
          </button>
        )}
      </div>
      {(meta || metaEnd) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-sm text-muted tabular-nums">
          <p aria-live="polite">{meta}</p>
          {metaEnd && <p>{metaEnd}</p>}
        </div>
      )}
    </div>
  )
}
