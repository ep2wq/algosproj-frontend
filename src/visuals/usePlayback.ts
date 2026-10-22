import { useEffect, useRef, useState } from 'react'
import { play } from '../sound'

// Milliseconds per step.
export const SPEEDS = { slow: 1200, normal: 600, fast: 250 }
export type Speed = keyof typeof SPEEDS

// Play/pause and stepping through a list of frames. Never starts playing by itself, unless
// autoplay: then it plays once from the first step, or with reduced motion opens on the last step.
// silent: no step and finish sounds (pages that play on load; a page load makes no sound).
export function usePlayback(frameCount: number, { silent = false, autoplay = false } = {}) {
  const [reduced] = useState(() => autoplay && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [step, setStep] = useState(reduced ? frameCount - 1 : 0)
  const [playing, setPlaying] = useState(autoplay && !reduced && frameCount > 1)
  const [speed, setSpeed] = useState<Speed>('normal')
  const lastStep = frameCount - 1

  // One timeout per step. The cleanup clears it on pause, on any change and on unmount.
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (step + 1 >= lastStep) setPlaying(false)
      setStep(step + 1)
    }, SPEEDS[speed])
    return () => clearTimeout(timer)
  }, [playing, step, lastStep, speed])

  // A quiet tick for each step between the first and the last, and a chime on reaching the last one
  // going forward. Silent on reset and at the first step. The step text and counter already say it.
  const shownStep = useRef(step)
  useEffect(() => {
    if (step === shownStep.current) return
    if (!silent) {
      if (step === lastStep && step > shownStep.current) play('finish')
      else if (step > 0 && step < lastStep) play('step')
    }
    shownStep.current = step
  }, [step, lastStep, silent])

  function togglePlay() {
    if (playing) {
      setPlaying(false)
      return
    }
    if (lastStep === 0) return
    if (step >= lastStep) setStep(0)
    setPlaying(true)
  }

  // Pauses and jumps to a step (clamped). goTo(0) is also the reset after new input.
  function goTo(nextStep: number) {
    setPlaying(false)
    setStep(Math.max(0, Math.min(lastStep, nextStep)))
  }

  // Plays from the first step, whatever is happening now (a Replay button).
  function restart() {
    setStep(0)
    setPlaying(lastStep > 0)
  }

  return { step, lastStep, playing, speed, setSpeed, togglePlay, goTo, restart }
}
