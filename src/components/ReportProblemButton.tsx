import { useTranslation } from 'react-i18next'
import type { BugReportErrorContext } from '../api'
import { errorContext, openBugReport } from '../reportBug'

// "Report this problem" on an error screen or a block that failed to load: opens the report
// dialog with the error filled in. Not for expected form feedback (wrong password, field errors).
// The default look sits next to "Try again" inside an error box (the box's colour, 44 px on touch).
export const alertButton = 'ms-2 mt-2 inline-flex min-h-11 items-center rounded border border-current px-3 text-sm font-medium hover:bg-fail/10 sm:pointer-fine:min-h-0 sm:pointer-fine:py-1'

export default function ReportProblemButton({ error, context, className = alertButton }: { error?: unknown; context?: BugReportErrorContext; className?: string }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => openBugReport(context ?? errorContext(error))}
      className={className}
    >
      {t('bugReport.reportProblem')}
    </button>
  )
}
