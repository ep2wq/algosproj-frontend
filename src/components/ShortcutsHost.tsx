import { lazy, Suspense, useEffect, useState } from 'react'
import { inTextField, OPEN_SHORTCUTS, SEARCH_ATTRIBUTE } from '../shortcuts'

const ShortcutsDialog = lazy(() => import('./ShortcutsDialog'))

// The site-wide keys, in Layout: "/" focuses the page's search field, "?" (or "Keyboard shortcuts" in
// the More menu) opens the dialog, a lazy chunk. Neither fires while typing in a field or while
// another dialog is open.
export default function ShortcutsHost() {
  const [open, setOpen] = useState<{ n: number; opener: HTMLElement | null } | null>(null)

  useEffect(() => {
    const show = () =>
      setOpen((old) => ({ n: (old?.n ?? 0) + 1, opener: document.activeElement instanceof HTMLElement ? document.activeElement : null }))
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || inTextField(event.target) || document.querySelector('dialog[open]')) return
      // event.key is not "/" or "?" on every layout (Arabic gives ظ and ؟), so the key's place counts too.
      const slash = event.code === 'Slash' && !event.shiftKey
      const help = event.key === '?' || event.key === '؟' || (event.code === 'Slash' && event.shiftKey)
      if (event.key === '/' || slash) {
        const search = document.querySelector<HTMLInputElement>(`[${SEARCH_ATTRIBUTE}]`)
        if (!search) return
        event.preventDefault()
        search.focus()
      } else if (help) {
        event.preventDefault()
        show()
      }
    }
    window.addEventListener(OPEN_SHORTCUTS, show)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener(OPEN_SHORTCUTS, show)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  if (!open) return null
  return (
    <Suspense fallback={null}>
      <ShortcutsDialog
        key={open.n}
        onClose={() => {
          setOpen(null)
          open.opener?.focus()
        }}
      />
    </Suspense>
  )
}
