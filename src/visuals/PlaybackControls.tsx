import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import type { Speed, usePlayback } from './usePlayback'

type Playback = ReturnType<typeof usePlayback>

// 44 px tall on a touch screen (a phone, either way up); 36 px from sm with a mouse.
export const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded border border-field bg-surface px-3 text-sm hover:border-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:pointer-fine:min-h-9'

export function SpeedSelect({ playback }: { playback: Playback }) {
  const { t } = useTranslation('visuals')
  const id = useId()
  return (
    <div>
      <label htmlFor={`${id}-speed`} className="text-sm font-medium">
        {t('common.speed')}
      </label>
      <select
        id={`${id}-speed`}
        value={playback.speed}
        onChange={(event) => playback.setSpeed(event.target.value as Speed)}
        className="ms-2 rounded border border-field bg-surface px-2 py-1 text-sm hover:border-muted"
      >
        <option value="slow">{t('common.slow')}</option>
        <option value="normal">{t('common.normal')}</option>
        <option value="fast">{t('common.fast')}</option>
      </select>
    </div>
  )
}

// Play/Pause, Step back, Step forward, Reset and "Step 3 of 9", shared by every visualization. wide
// (the landing hero): from md the progress track fills the rest of the row instead of its own row.
export default function PlaybackControls({ playback, wide = false }: { playback: Playback; wide?: boolean }) {
  const { t } = useTranslation('visuals')
  const { step, lastStep, playing, togglePlay, goTo } = playback
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={togglePlay}
        aria-disabled={lastStep === 0}
        className="inline-flex min-h-11 min-w-20 items-center justify-center rounded bg-accent px-4 text-sm font-medium text-inverse hover:bg-accent/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:pointer-fine:min-h-9"
      >
        {playing ? t('common.pause') : t('common.play')}
      </button>
      <button type="button" onClick={() => goTo(step - 1)} aria-disabled={step === 0} className={buttonClass}>
        {t('common.stepBack')}
      </button>
      <button type="button" onClick={() => goTo(step + 1)} aria-disabled={step >= lastStep} className={buttonClass}>
        {t('common.stepForward')}
      </button>
      <button type="button" onClick={() => goTo(0)} className={buttonClass}>
        {t('common.reset')}
      </button>
      <span className="text-sm text-muted tabular-nums">{t('common.stepOf', { step: Math.min(step, lastStep) + 1, count: lastStep + 1 })}</span>
      {/* How far through the steps, in reading direction. "Step 3 of 9" says the same in words. */}
      <div aria-hidden="true" className={`h-1 basis-full overflow-hidden rounded-full bg-line ${wide ? 'md:ms-2 md:min-w-24 md:flex-1 md:basis-auto' : ''}`}>
        <div
          className="h-full origin-left rounded-full bg-accent motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-calm rtl:origin-right"
          style={{ transform: `scaleX(${lastStep > 0 ? Math.min(step, lastStep) / lastStep : 1})` }}
        />
      </div>
    </div>
  )
}
