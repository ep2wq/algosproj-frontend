import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { DUR, moveDuration, reducedMotion } from '../motion'
import { inTextField } from '../shortcuts'
import { play } from '../sound'

// Milliseconds per step.
export const SPEEDS = { slow: 1200, normal: 600, fast: 250 }
export type Speed = keyof typeof SPEEDS

// Controls that keep their own Space (it activates them) and scroll boxes that keep their own arrows.
const OWN_SPACE = 'button, a[href], summary, [role="button"], [role="tab"], [role="slider"]'

// Play/pause and stepping through a list of frames. Never starts playing by itself, unless
// autoplay: then it plays once from the first step, or with reduced motion opens on the last step.
// silent: no step and finish sounds (pages that play on load; a page load makes no sound).
export function usePlayback(frameCount: number, { silent = false, autoplay = false } = {}) {
  const [reduced] = useState(() => autoplay && reducedMotion())
  // travel: the step was reached by playing forward, so the drawing moves to it (useFlip, StepText).
  // Step back/forward, Reset and new input jump straight to the pose.
  // The object is replaced on every move, even to the same step (new input at step 0), which tells
  // useFlip to measure again.
  const [position, setPosition] = useState({ step: reduced ? frameCount - 1 : 0, travel: false })
  const { step, travel } = position
  const [playing, setPlaying] = useState(autoplay && !reduced && frameCount > 1)
  const [speed, setSpeed] = useState<Speed>('normal')
  const lastStep = frameCount - 1

  // The speed sets the time between steps and, with it, how long a move takes (always shorter than the
  // step) and how long the step text takes to fade in once the move has ended.
  const stepMs = SPEEDS[speed]
  const moveMs = moveDuration(stepMs)
  const textMs = Math.round(Math.min(DUR.ui, (stepMs - moveMs) * 0.6))

  // One timeout per step. The cleanup clears it on pause, on any change and on unmount.
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (step + 1 >= lastStep) setPlaying(false)
      setPosition({ step: step + 1, travel: true })
    }, stepMs)
    return () => clearTimeout(timer)
  }, [playing, step, lastStep, stepMs])

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
    if (step >= lastStep) setPosition({ step: 0, travel: false })
    setPlaying(true)
  }

  // Pauses and jumps to a step (clamped). goTo(0) is also the reset after new input.
  function goTo(nextStep: number) {
    setPlaying(false)
    setPosition({ step: Math.max(0, Math.min(lastStep, nextStep)), travel: false })
  }

  // Plays from the first step, whatever is happening now (a Replay button).
  function restart() {
    setPosition({ step: 0, travel: false })
    setPlaying(lastStep > 0)
  }

  // Space plays or pauses, Left steps back and Right forward (the drawing is left to right in both
  // languages), only while focus is inside the visualization. Typing is never taken: not in a field,
  // not Space on a control that uses it itself, not the arrows of a drawing that scrolls sideways.
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    const target = event.target as HTMLElement
    if (inTextField(target)) return
    if (event.key === ' ') {
      if (target.closest(OWN_SPACE)) return
      if (event.repeat) {
        event.preventDefault()
        return
      }
      togglePlay()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (target.scrollWidth > target.clientWidth + 1) return
      goTo(step + (event.key === 'ArrowLeft' ? -1 : 1))
    } else {
      return
    }
    event.preventDefault()
  }

  // For the visualization's outermost element: the keys above, focus on a click anywhere in it, and
  // the durations as CSS variables (--dur-move replaces the token inside the visualization).
  const rootProps = {
    tabIndex: -1,
    onKeyDown,
    'data-playback': '',
    // The pulse (animate-hit) only plays when a step was reached by playing forward.
    'data-travel': travel ? '' : undefined,
    style: { '--dur-move': `${moveMs}ms`, '--dur-text': `${textMs}ms` } as CSSProperties,
  }

  return { step, lastStep, playing, speed, setSpeed, togglePlay, goTo, restart, travel, position, moveMs, rootProps }
}
