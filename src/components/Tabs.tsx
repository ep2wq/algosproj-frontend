import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'

export type Tab = { id: string; label: string }

// The WAI-ARIA tabs pattern, automatic activation: only the selected tab is in the Tab order
// (roving tabindex); the arrow keys move between tabs in reading order (in Arabic the left arrow
// goes to the next tab), Home and End to the first and last. A panel is rendered the first time
// its tab is selected and then stays mounted (hidden), so its data loads once. Tab moves from the
// tab row into the open panel. The row scrolls sideways inside itself if the labels do not fit.
export default function Tabs({
  label,
  tabs,
  selected,
  onSelect,
  renderPanel,
}: {
  label: string
  tabs: Tab[]
  selected: string
  onSelect: (id: string) => void
  renderPanel: (id: string) => ReactNode
}) {
  const id = useId()
  const [opened, setOpened] = useState<string[]>([selected])
  if (!opened.includes(selected)) setOpened([...opened, selected])

  function select(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length]
    onSelect(tab.id)
    document.getElementById(`${id}-tab-${tab.id}`)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((tab) => tab.id === selected)
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const next = rtl ? 'ArrowLeft' : 'ArrowRight'
    const previous = rtl ? 'ArrowRight' : 'ArrowLeft'
    if (event.key === next) select(current + 1)
    else if (event.key === previous) select(current - 1)
    else if (event.key === 'Home') select(0)
    else if (event.key === 'End') select(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((tab) => {
          const active = tab.id === selected
          return (
            <button
              key={tab.id}
              id={`${id}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${id}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              className={`-mb-px min-h-11 shrink-0 border-b-2 px-3 font-medium whitespace-nowrap focus-visible:-outline-offset-2 sm:px-4 ${
                active ? 'border-accent text-ink' : 'border-transparent text-muted hover:border-line hover:text-accent'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== selected}
          className="rounded pt-6 focus-visible:outline-offset-4"
        >
          {opened.includes(tab.id) && renderPanel(tab.id)}
        </div>
      ))}
    </div>
  )
}
