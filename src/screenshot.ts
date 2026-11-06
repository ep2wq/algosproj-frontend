import { toCanvas } from 'html-to-image'

// The bug report screenshot (README "Bug reports"): the visible part of the page, without the
// report dialog, at most 1600 px on its longest side, WebP (PNG where the browser cannot encode
// WebP), under 1.5 MB. Lazy: this file and html-to-image load only when a report is opened.

// Painted over after the capture, so what was typed there never reaches the image.
const MASKED = 'input[type="password"], input[autocomplete="one-time-code"], [data-no-screenshot]'
const MAX_SIDE = 1600
const MAX_BYTES = 1.5 * 1024 * 1024

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function takeScreenshot(): Promise<Blob | null> {
  const width = window.innerWidth
  const height = window.innerHeight
  const masks = Array.from(document.querySelectorAll(MASKED))
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < height)
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_SIDE / Math.max(width, height))
  // Only the standard properties: computed values already have var() resolved, and copying every
  // custom property to every node was most of the time (Monaco adds about 1,400 --vscode-* ones,
  // which made the problem page take 3 s instead of under 1 s).
  const properties = Array.from(getComputedStyle(document.documentElement)).filter((name) => !name.startsWith('--'))

  const canvas = await toCanvas(document.body, {
    width,
    height,
    pixelRatio: ratio,
    // The page's own fonts are not embedded (faster; the text falls back to system fonts).
    skipFonts: true,
    includeStyleProperties: properties,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    style: { transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`, transformOrigin: 'top left' },
    filter: (node) => !(node instanceof HTMLDialogElement),
  })

  const context = canvas.getContext('2d')
  if (!context) return null
  context.fillStyle = '#6b7280'
  for (const rect of masks) {
    context.fillRect(rect.left * ratio, rect.top * ratio, rect.width * ratio, rect.height * ratio)
  }

  let blob = await encode(canvas, 'image/webp', 0.85)
  if (blob && blob.type !== 'image/webp') blob = await encode(canvas, 'image/png', 1)
  if (blob && blob.size > MAX_BYTES && blob.type === 'image/webp') blob = await encode(canvas, 'image/webp', 0.6)
  return blob && blob.size <= MAX_BYTES ? blob : null
}
