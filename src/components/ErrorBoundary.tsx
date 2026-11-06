import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { primaryButton, secondaryButton } from './buttonStyles'
import ReportProblemButton from './ReportProblemButton'

// One top-level boundary (main.tsx): a render error shows a plain page with Reload and a report
// button instead of a blank screen.
function Fallback({ error }: { error: unknown }) {
  const { t } = useTranslation()
  return (
    <main className="site-container py-10">
      <div role="alert" className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('bugReport.boundaryTitle')}</h1>
        <p className="mt-2">{t('bugReport.boundaryBody')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className={primaryButton}>
            {t('bugReport.reload')}
          </button>
          <ReportProblemButton error={error} className={secondaryButton} />
        </div>
      </div>
    </main>
  )
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Also lands in the bug report buffer (capture.ts wraps console.error).
    console.error(error, info.componentStack)
  }

  render() {
    return this.state.error ? <Fallback error={this.state.error} /> : this.props.children
  }
}
