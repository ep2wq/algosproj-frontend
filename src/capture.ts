// What a bug report may include about the last moments before it (README "Bug reports"): the
// last 10 failed API calls and the last 10 console errors, in memory only. No network, no storage:
// nothing leaves the browser unless the user sends a report and keeps that part ticked.

export type FailedRequest = { method: string; path: string; status: number; time: string; code?: string; message: string }
export type ConsoleError = { message: string; time: string }

const MAX = 10
const failed: FailedRequest[] = []
const errors: ConsoleError[] = []

const cut = (text: string) => text.slice(0, 300)
const push = <T>(list: T[], item: T) => {
  list.push(item)
  if (list.length > MAX) list.shift()
}

// From api.ts: method, path without the query, status, message. Never a body, header or cookie.
export function recordFailedRequest(method: string, path: string, status: number, message: string, code?: string) {
  push(failed, { method, path: path.split(/[?#]/)[0], status, time: new Date().toISOString(), message: cut(message), ...(code ? { code } : {}) })
}

function recordError(value: unknown) {
  const message = value instanceof Error ? `${value.name}: ${value.message}` : String(value)
  push(errors, { message: cut(message), time: new Date().toISOString() })
}

let started = false

// Once, at boot (main.tsx). console.error keeps working as before: the original is always called.
export function startCapture() {
  if (started) return
  started = true
  window.addEventListener('error', (event) => recordError(event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => recordError(event.reason))
  const original = console.error
  console.error = (...args: unknown[]) => {
    try {
      recordError(args.map((arg) => (arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg))).join(' '))
    } catch {
      // Never let the buffer break logging.
    }
    original.apply(console, args)
  }
}

export function captured(): { failed: FailedRequest[]; errors: ConsoleError[] } {
  return { failed: [...failed], errors: [...errors] }
}
