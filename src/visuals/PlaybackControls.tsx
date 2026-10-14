import { useId } from 'react'
import type { Speed, usePlayback } from './usePlayback'

type Playback = ReturnType<typeof usePlayback>

export const buttonClass = 'rounded border border-line bg-white px-3 py-1.5 text-sm hover:border-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

export function SpeedSelect({ playback }: { playback: Playback }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={`${id}-speed`} className="text-sm font-medium">
        Speed
      </label>
      <select
        id={`${id}-speed`}
        value={playback.speed}
        onChange={(event) => playback.setSpeed(event.target.value as Speed)}
        className="ml-2 rounded border border-line bg-white px-2 py-1 text-sm hover:border-muted"
      >
        <option value="slow">Slow</option>
        <option value="normal">Normal</option>
        <option value="fast">Fast</option>
      </select>
    </div>
  )
}

// Play/Pause, Step back, Step forward, Reset and "Step 3 of 9", shared by every visualization.
export default function PlaybackControls({ playback }: { playback: Playback }) {
  const { step, lastStep, playing, togglePlay, goTo } = playback
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={togglePlay}
        aria-disabled={lastStep === 0}
        className="min-w-20 rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={() => goTo(step - 1)} aria-disabled={step === 0} className={buttonClass}>
        Step back
      </button>
      <button type="button" onClick={() => goTo(step + 1)} aria-disabled={step >= lastStep} className={buttonClass}>
        Step forward
      </button>
      <button type="button" onClick={() => goTo(0)} className={buttonClass}>
        Reset
      </button>
      <span className="text-sm text-muted tabular-nums">
        Step {Math.min(step, lastStep) + 1} of {lastStep + 1}
      </span>
    </div>
  )
}
