import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { DUR, EASE, reducedMotion } from '../motion'

// Pose to pose (FLIP): the frames are the poses, this moves the drawing between them. Mark each piece
// that keeps its identity across steps with data-flip="<id>" (a value cell, a pointer label, a tree
// node; never one marked piece inside another). After every render the pieces are measured; when the
// step was reached by playing forward (playback.travel), each piece that changed place starts from
// where it was and travels to where it is now, with transform and opacity only:
// - first a short beat in which only the colours change (the highlight comes before the move),
// - then the move, ending with a little follow-through (EASE.settle),
// - a secondary piece (data-flip-lag: a label, an index, an edge) follows 50 ms behind,
// - a piece that is new fades in; so does one marked data-flip-fade when it is redrawn elsewhere (an
//   arrow that turns round), or data-flip-fade="shape" when its size changed (an edge between two
//   nodes that moved differently), but only as the move ends: such a piece cannot travel.
// data-flip-arc="<pixels>" (the most the path may bow): the piece travels on an arc, over when going
// right and under when going left, so two that swap places do not cross.
// Stepping, Reset, new input and reduced motion show the pose at once. Everything ends within
// playback.moveMs, which is shorter than a step.
// The pieces are measured when the position changes (a step, Reset, new input: playback.position is a
// new object each time) and when the box is resized, not on every render.

type Flip = { step: number; travel: boolean; moveMs: number; position: object }
type Place = { x: number; y: number; w: number; h: number }

const LAG_MS = 50
const ARC_SAMPLES = 12

// y of a cubic-bezier easing at time x (0..1), by bisection.
function ease(curve: string, x: number) {
  const [x1, y1, x2, y2] = curve.match(/-?[\d.]+/g)!.map(Number)
  const at = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3
  let low = 0
  let high = 1
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    if (at(x1, x2, mid) < x) low = mid
    else high = mid
  }
  return at(y1, y2, (low + high) / 2)
}

// The path from (dx, dy) back to its own place, bowed sideways by up to `bow` pixels: both axes
// sampled from the settle curve (the samples carry the easing; between two of them it is a straight
// line too short to see).
function arcKeyframes(dx: number, dy: number, bow: number): Keyframe[] {
  const length = Math.hypot(dx, dy)
  const height = Math.min(bow, Math.max(6, length * 0.25))
  // (dx, dy) points from the new place to the old one: the normal on the left of the direction of
  // travel is up for a piece going right, down for one going left.
  const nx = -dy / length
  const ny = dx / length
  return Array.from({ length: ARC_SAMPLES + 1 }, (_, i) => {
    const progress = ease(EASE.settle, i / ARC_SAMPLES)
    const rest = 1 - progress
    const lift = Math.sin(Math.PI * Math.min(progress, 1)) * height
    return { transform: `translate(${(dx * rest + nx * lift).toFixed(2)}px, ${(dy * rest + ny * lift).toFixed(2)}px)` }
  })
}

// Places inside the box's own content, so scrolling the page or the drawing moves nothing.
function measure(box: HTMLElement) {
  const origin = box.getBoundingClientRect()
  const places = new Map<string, Place>()
  const pieces = [...box.querySelectorAll<HTMLElement | SVGElement>('[data-flip]')]
  for (const piece of pieces) {
    const rect = piece.getBoundingClientRect()
    places.set(piece.dataset.flip!, { x: rect.left - origin.left + box.scrollLeft, y: rect.top - origin.top + box.scrollTop, w: rect.width, h: rect.height })
  }
  return { places, pieces }
}

const isRunning = (animations: Animation[]) => animations.some((animation) => animation.playState === 'running')

export function useFlip(ref: RefObject<HTMLElement | null>, { step, travel, moveMs, position }: Flip) {
  const seen = useRef({ step, width: 0, places: new Map<string, Place>(), running: [] as Animation[] })

  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    const last = seen.current
    const stepped = last.step !== step
    // Run twice for the same position (development's double effect): the move is already going.
    if (!stepped && isRunning(last.running)) return
    for (const animation of last.running) animation.cancel()

    const { places, pieces } = measure(box)

    const running: Animation[] = []
    // Only one step forward while playing, in a box that kept its width (a resized window lays the
    // drawing out again: nothing should fly across it).
    if (stepped && travel && step === last.step + 1 && last.width === box.clientWidth && !reducedMotion() && typeof box.animate === 'function') {
      const beat = Math.min(DUR.micro, moveMs * 0.25)
      for (const piece of pieces) {
        const now = places.get(piece.dataset.flip!)!
        const before = last.places.get(piece.dataset.flip!)
        const lag = 'flipLag' in piece.dataset ? LAG_MS : 0
        const arc = Number(piece.dataset.flipArc ?? 0)
        const fade = piece.dataset.flipFade
        // Between centres, so a piece that only grew (a thicker outline) has not moved.
        const dx = before ? before.x + before.w / 2 - now.x - now.w / 2 : 0
        const dy = before ? before.y + before.h / 2 - now.y - now.h / 2 : 0
        const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5
        // More than an outline getting thicker.
        const reshaped = before !== undefined && (Math.abs(before.w - now.w) > 3 || Math.abs(before.h - now.h) > 3)
        if (before === undefined || (fade !== undefined && (reshaped || (moved && fade !== 'shape')))) {
          // New or redrawn: fades in, at once when it is a main piece that is new, else as the move ends.
          const duration = Math.min(DUR.ui, moveMs / 2)
          const finalOpacity = getComputedStyle(piece).opacity
          const delay = before === undefined && lag === 0 ? beat : moveMs - duration
          running.push(piece.animate([{ opacity: 0 }, { opacity: finalOpacity }], { duration, delay, easing: EASE.out, fill: 'backwards' }))
        } else if (moved) {
          const duration = Math.max(1, moveMs - beat - lag)
          const options = { duration, delay: beat + lag, fill: 'backwards' as const }
          running.push(
            arc > 0
              ? piece.animate(arcKeyframes(dx, dy, arc), options)
              : piece.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { ...options, easing: EASE.settle }),
          )
        }
      }
    }

    seen.current = { step, width: box.clientWidth, places, running }
    // position stands for the frame: it is a new object whenever the step or the input changed.
  }, [ref, step, travel, moveMs, position])

  // A resized box lays the drawing out again: the next step starts from the new places. Not in the
  // middle of a move (the pieces are displaced then); the width check above covers that case.
  useEffect(() => {
    const box = ref.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const last = seen.current
      if (isRunning(last.running)) return
      seen.current = { ...last, width: box.clientWidth, places: measure(box).places }
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [ref])
}

// Which piece is in each position of each frame's array, for data-flip: the frames only hold values,
// so a piece is followed from one frame to the next. Positions that changed take the pieces that left
// the other changed positions, matched by value (a swap, a shift, a merge written back); a value that
// was in none of them is a new piece.
export function trackPieces(arrays: readonly (readonly (string | number)[])[]): number[][] {
  const ids: number[][] = []
  let nextId = 0
  arrays.forEach((array, frame) => {
    const previous = frame === 0 ? [] : arrays[frame - 1]
    const before = frame === 0 ? [] : ids[frame - 1]
    const row = array.map((value, index) => (index < previous.length && previous[index] === value ? before[index] : -1))
    const free = previous.map((_, index) => index).filter((index) => row[index] !== before[index])
    ids.push(
      row.map((id, index) => {
        if (id !== -1) return id
        const from = free.findIndex((candidate) => previous[candidate] === array[index])
        return from === -1 ? nextId++ : before[free.splice(from, 1)[0]]
      }),
    )
  })
  return ids
}
