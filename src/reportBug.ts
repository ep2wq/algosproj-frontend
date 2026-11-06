import { ApiError, type BugReportErrorContext, type BugReportProblem } from './api'

// Opening the "Report a bug" dialog from anywhere (README "Bug reports"). Small and in the main
// bundle: the dialog, the screenshot code and html-to-image are lazy chunks loaded on first use.

export const OPEN_BUG_REPORT = 'algoslab:report-bug'

export type BugReportRequest = {
  error?: BugReportErrorContext
  // Resolves to the screenshot, or null when it failed or took more than 3 seconds.
  screenshot: Promise<Blob | null>
  // Gets focus back when the dialog closes.
  opener: HTMLElement | null
}

const SCREENSHOT_TIMEOUT_MS = 3000

// The status, path and message of an error shown on the page, for error_context.
export function errorContext(error: unknown): BugReportErrorContext {
  if (error instanceof ApiError) {
    return { status: error.status, path: error.path, message: error.message.slice(0, 300) }
  }
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`.slice(0, 300) }
  return typeof error === 'string' && error ? { message: error.slice(0, 300) } : {}
}

// Called in the click handler: the screenshot starts now, before the dialog covers the page.
export function openBugReport(error?: BugReportErrorContext) {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), SCREENSHOT_TIMEOUT_MS))
  const screenshot = Promise.race([import('./screenshot').then((m) => m.takeScreenshot()), timeout]).catch(() => null)
  const detail: BugReportRequest = { error, screenshot, opener }
  window.dispatchEvent(new CustomEvent(OPEN_BUG_REPORT, { detail }))
}

// The problem page registers what "my code and the problem" sends (ProblemSolver).
let problemSource: (() => BugReportProblem) | null = null

export function setProblemSource(source: () => BugReportProblem): () => void {
  problemSource = source
  return () => {
    if (problemSource === source) problemSource = null
  }
}

export function currentProblem(): BugReportProblem | null {
  return problemSource ? problemSource() : null
}
