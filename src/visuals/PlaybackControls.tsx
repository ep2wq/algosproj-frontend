import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { reducedMotion } from '../motion'
import type { Speed, usePlayback } from './usePlayback'

type Playback = ReturnType<typeof usePlayback>

// 44 px tall on a touch screen (a phone, either way up); 36 px from sm with a mouse.
export const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded border border-field bg-surface px-3 text-sm hover:border-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:pointer-fine:min-h-9'

// The transport's icon buttons: 44 px square on a touch screen, 32 px with a mouse, so Play (36 px
// tall and wider) stays the largest control of the row.
const iconButtonClass =
  'inline-flex size-11 items-center justify-center rounded border border-field bg-surface hover:border-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:pointer-fine:size-8'

// The step text of a visual on the landing page's card (a demo): taller and, from md, larger than in a
// lesson, and not a live region (it plays by itself and would talk over the page).
export const demoCaptionClass = 'mt-3 min-h-16 note-box rounded-lg px-3 py-2 text-sm md:text-base'

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

// What the step says, shared by every visualization. While it plays, the text of a new step waits
// until the drawing has finished moving (the old text stays meanwhile), then fades in over
// --dur-text, so the words never compete with the move. A jump (Step back/forward, Reset) and
// reduced motion show it at once. demo (the landing page's card): the taller caption, not a live region.
export function StepText({
  playback,
  text,
  demo = false,
  live = demo ? undefined : 'polite',
  className = demo ? demoCaptionClass : 'mt-3 min-h-12 note-box rounded-lg px-3 py-2 text-sm',
}: {
  playback: Playback
  text: string
  demo?: boolean
  live?: 'polite' | 'off'
  className?: string
}) {
  const { step, travel, moveMs } = playback
  const [shown, setShown] = useState({ step, text })
  const waiting = shown.step !== step && travel && !reducedMotion()
  if (shown.step !== step && !waiting) setShown({ step, text })

  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(() => setShown({ step, text }), moveMs)
    return () => clearTimeout(timer)
  }, [waiting, step, text, moveMs])

  return (
    <p aria-live={live} className={className}>
      <span key={waiting ? shown.step : step} className="block motion-safe:animate-step-text">
        <TextWithCode text={waiting ? shown.text : text} />
      </span>
    </p>
  )
}

// The transport, shared by every visualization, laid out like a media player's: Step back, Play/Pause
// (the largest), Step forward, Reset, then "Step 3 of 9" and the progress track. The buttons stay in
// that order in Arabic too (media controls are not mirrored; Step back points left like the Left key).
// wide (the landing hero): from md the progress track fills the rest of the row instead of its own row.
export default function PlaybackControls({ playback, wide = false }: { playback: Playback; wide?: boolean }) {
  const { t } = useTranslation('visuals')
  const { step, lastStep, playing, togglePlay, goTo } = playback
  const PlayIcon = playing ? Pause : Play
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div dir="ltr" className="flex items-center gap-2">
        <button type="button" onClick={() => goTo(step - 1)} aria-disabled={step === 0} aria-label={t('common.stepBack')} title={t('common.stepBack')} className={iconButtonClass}>
          <SkipBack aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-disabled={lastStep === 0}
          className="inline-flex min-h-11 min-w-24 items-center justify-center gap-2 rounded bg-accent px-4 text-sm font-medium text-inverse hover:bg-accent/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:pointer-fine:min-h-9"
        >
          <PlayIcon aria-hidden="true" className="size-4 fill-current" />
          {playing ? t('common.pause') : t('common.play')}
        </button>
        <button type="button" onClick={() => goTo(step + 1)} aria-disabled={step >= lastStep} aria-label={t('common.stepForward')} title={t('common.stepForward')} className={iconButtonClass}>
          <SkipForward aria-hidden="true" className="size-4" />
        </button>
        <button type="button" onClick={() => goTo(0)} aria-label={t('common.reset')} title={t('common.reset')} className={iconButtonClass}>
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>
      <span className="text-sm text-muted tabular-nums">{t('common.stepOf', { step: Math.min(step, lastStep) + 1, count: lastStep + 1 })}</span>
      {/* How far through the steps, left to right in both languages like the stage and the transport. "Step 3 of 9" says the same in words. */}
      <div aria-hidden="true" className={`h-1 basis-full overflow-hidden rounded-full bg-line ${wide ? 'md:ms-2 md:min-w-24 md:flex-1 md:basis-auto' : ''}`}>
        <div
          dir="ltr"
          className="h-full origin-left rounded-full bg-accent motion-safe:transition-transform motion-safe:duration-(--dur-ui) motion-safe:ease-out"
          style={{ transform: `scaleX(${lastStep > 0 ? Math.min(step, lastStep) / lastStep : 1})` }}
        />
      </div>
    </div>
  )
}
