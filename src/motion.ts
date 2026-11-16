// Motion tokens for JS-driven animation (Web Animations, timers). The same values as --dur-* and
// --ease-* in src/index.css: change both together. Every animation sits behind reducedMotion().

// Milliseconds.
export const DUR = { micro: 120, ui: 200, state: 250, move: 350, max: 500 } as const

export const EASE = {
  out: 'cubic-bezier(0.2, 0, 0, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  settle: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
} as const

// True when the visitor asks for less motion. False without a window (the build prerenders), so
// call it when animating, not at import time.
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Visualization moves: --dur-move (350 ms) belongs to the normal step time (600 ms) and scales with
// the step time (SPEEDS in src/visuals/usePlayback.ts), but never takes more than 80% of a step, so a
// transition always ends before the next step starts. Longer than DUR.max only at slow speed.
const NORMAL_STEP_MS = 600
export function moveDuration(stepMs: number): number {
  return Math.round(Math.min(DUR.move * (stepMs / NORMAL_STEP_MS), stepMs * 0.8))
}
