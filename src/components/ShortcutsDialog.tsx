import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isApple } from '../shortcuts'
import { secondaryButton } from './buttonStyles'

// The keyboard shortcuts list: a native modal dialog like the bug report one (Escape closes it,
// focus returns to what opened it, ShortcutsHost). Keys stay Latin and left to right in Arabic too.
const PLUS = '+'

export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const mod = isApple() ? t('shortcuts.cmd') : t('shortcuts.ctrl')

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const rows: [string[], string][] = [
    [['/'], t('shortcuts.search')],
    [[mod, t('shortcuts.enter')], t('shortcuts.submit')],
    [[t('shortcuts.space')], t('shortcuts.playPause')],
    [['← / →'], t('shortcuts.step')],
    [[t('shortcuts.esc')], t('shortcuts.close')],
    [['?'], t('shortcuts.help')],
  ]

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) ref.current.close()
      }}
      className="elev-floating m-auto w-[calc(100%-2rem)] max-w-md p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line ps-4 pe-1">
        <h2 id={titleId} className="py-2 text-lg font-semibold">
          {t('shortcuts.title')}
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label={t('shortcuts.closeDialog')} className="inline-flex size-11 items-center justify-center rounded text-muted hover:bg-hover hover:text-ink">
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <dl className="divide-y divide-line px-4">
        {rows.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="min-w-0">{label}</dt>
            <dd dir="ltr" className="flex shrink-0 items-center gap-1">
              {keys.map((key, index) => (
                <span key={key} className="flex items-center gap-1">
                  {index > 0 && <span aria-hidden="true" className="text-muted">{PLUS}</span>}
                  <kbd className="elev-raised min-w-7 rounded border border-field bg-surface px-1.5 py-0.5 text-center font-mono text-xs">{key}</kbd>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex justify-end border-t border-line p-2">
        <button type="button" onClick={() => ref.current?.close()} className={`${secondaryButton} px-4`}>
          {t('shortcuts.done')}
        </button>
      </div>
    </dialog>
  )
}
