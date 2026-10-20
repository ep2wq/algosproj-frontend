import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import type { Speed, usePlayback } from './usePlayback'

type Playback = ReturnType<typeof usePlayback>

export const buttonClass = 'rounded border border-field bg-surface px-3 py-1.5 text-sm hover:border-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

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

// Play/Pause, Step back, Step forward, Reset and "Step 3 of 9", shared by every visualization.
export default function PlaybackControls({ playback }: { playback: Playback }) {
  const { t } = useTranslation('visuals')
  const { step, lastStep, playing, togglePlay, goTo } = playback
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={togglePlay}
        aria-disabled={lastStep === 0}
        className="min-w-20 rounded bg-accent px-4 py-1.5 text-sm font-medium text-inverse hover:bg-accent/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
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
    </div>
  )
}
