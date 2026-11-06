import { lazy, Suspense, useEffect, useState } from 'react'
import { OPEN_BUG_REPORT, type BugReportRequest } from '../reportBug'

const BugReportDialog = lazy(() => import('./BugReportDialog'))

// One place that shows the report dialog, whoever opened it (main.tsx, outside the error
// boundary, so it also works from the boundary's fallback). The dialog is a lazy chunk.
export default function BugReportHost() {
  const [request, setRequest] = useState<{ n: number; detail: BugReportRequest } | null>(null)

  useEffect(() => {
    const open = (event: Event) => setRequest((old) => ({ n: (old?.n ?? 0) + 1, detail: (event as CustomEvent<BugReportRequest>).detail }))
    window.addEventListener(OPEN_BUG_REPORT, open)
    return () => window.removeEventListener(OPEN_BUG_REPORT, open)
  }, [])

  if (!request) return null
  return (
    <Suspense fallback={null}>
      <BugReportDialog
        key={request.n}
        {...request.detail}
        onClose={() => {
          setRequest(null)
          request.detail.opener?.focus()
        }}
      />
    </Suspense>
  )
}
