import { useSyncExternalStore } from 'react'

// Small synthesized sounds, no audio files. A sound is never the only signal: each one accompanies
// something already visible and announced. Off by default (stored under `sound` as 'on' or 'off').
// No sound for typing, page loads, hover or navigation.
export type Sound = 'pass' | 'passPoints' | 'fail' | 'error' | 'step' | 'finish' | 'toggle'

// Tuning block. Change these by ear.
// MASTER: overall volume; every peak gain is MASTER times a note level of at most 1.
// ATTACK: seconds to fade a note in (avoids clicks).
// STEP_MIN_GAP_MS: 'step' sounds closer together than this are skipped.
// A note is [frequency Hz, wave, start offset s, length s, level 0..1].
const MASTER = 0.08
const ATTACK = 0.008
const STEP_MIN_GAP_MS = 120

type Wave = 'sine' | 'triangle'
type Note = [number, Wave, number, number, number]

const NOTES: Record<Sound, Note[]> = {
  // Bright, rising two notes: a small "yes".
  pass: [
    [523.25, 'sine', 0, 0.11, 1],
    [783.99, 'sine', 0.11, 0.14, 1],
  ],
  // The same rise plus a sparkly top note: a "yes, and you earned points".
  passPoints: [
    [523.25, 'sine', 0, 0.11, 1],
    [783.99, 'sine', 0.11, 0.11, 1],
    [1046.5, 'triangle', 0.22, 0.14, 0.6],
  ],
  // Soft, low, falling two notes: gentle "not yet", never harsh.
  fail: [
    [329.63, 'triangle', 0, 0.09, 0.8],
    [261.63, 'triangle', 0.1, 0.1, 0.8],
  ],
  // One low soft blip, also for compile errors and timeouts.
  error: [[220, 'sine', 0, 0.12, 0.7]],
  // Very quiet, very short tick for each visualization step.
  step: [[1320, 'sine', 0, 0.025, 0.25]],
  // Small soft chime when a visualization reaches its end.
  finish: [
    [783.99, 'sine', 0, 0.12, 0.6],
    [1046.5, 'sine', 0.09, 0.12, 0.6],
  ],
  // Short tick confirming the sound switch itself.
  toggle: [[880, 'sine', 0, 0.04, 0.5]],
}

const KEY = 'sound'
const listeners = new Set<() => void>()
let ctx: AudioContext | null = null
let lastStep = -Infinity

// Blocked or throwing storage behaves as "off".
function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    // Storage blocked.
    return false
  }
}

let on = readStored()

// Creates or resumes the one AudioContext. Only called from a user gesture.
function unlock() {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch {
    // No audio available.
  }
}

function onGesture() {
  if (on) unlock()
}

window.addEventListener('pointerdown', onGesture, { capture: true, passive: true })
window.addEventListener('keydown', onGesture, { capture: true, passive: true })

export function play(sound: Sound): void {
  try {
    if (!on || !ctx || ctx.state !== 'running' || document.visibilityState === 'hidden') return
    if (sound === 'step') {
      const now = performance.now()
      if (now - lastStep < STEP_MIN_GAP_MS) return
      lastStep = now
    }
    const start = ctx.currentTime
    for (const [freq, wave, offset, length, level] of NOTES[sound]) {
      const t0 = start + offset
      const t1 = t0 + length
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = wave
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(MASTER * level, t0 + ATTACK)
      gain.gain.exponentialRampToValueAtTime(0.0001, t1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t1 + 0.02)
    }
  } catch {
    // Playing is best effort.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getOn() {
  return on
}

export function setSoundOn(next: boolean): void {
  on = next
  try {
    localStorage.setItem(KEY, next ? 'on' : 'off')
  } catch {
    // Storage blocked: the choice lasts until the page is reloaded.
  }
  listeners.forEach((listener) => listener())
  if (next) {
    unlock()
    // A context created by this click may still be starting; tick once it runs.
    ctx?.resume().then(() => play('toggle'), () => {})
  }
}

// Whether sound is on (for the toggle button).
export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, getOn)
}
