import Editor from '@monaco-editor/react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ApiError, LANGUAGES, submitSolution, type Language, type Problem, type SubmitResult } from '../api'
import { useAuth } from '../auth'
import { LANGUAGE_LABELS, STARTER_CODE } from '../starters'
import SubmitResultPanel from './SubmitResultPanel'

export default function ProblemCard({ problem }: { problem: Problem }) {
  const { user, refreshUser } = useAuth()
  const location = useLocation()
  const [language, setLanguage] = useState<Language>('python')
  // Code is kept per language, so switching languages doesn't lose what was typed.
  const [code, setCode] = useState<Record<Language, string>>({ ...STARTER_CODE })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)

  const languageId = `language-${problem.id}`

  async function handleSubmit() {
    setBusy(true)
    setError('')
    try {
      const submitted = await submitSolution(problem.id, language, code[language])
      setResult(submitted)
      if (submitted.status === 'passed') {
        // Update the points in the header.
        refreshUser().catch(() => {})
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(Object.values(err.fieldErrors).flat().join(' ') || err.message)
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="mt-10 border-t border-line pt-8" aria-labelledby={`problem-${problem.id}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`problem-${problem.id}`} className="text-xl font-semibold">
          {problem.title}
        </h2>
        <span className="text-sm capitalize text-muted">{problem.difficulty}</span>
        <span className="text-sm text-muted tabular-nums">{problem.points} points</span>
      </div>
      <p className="mt-3 max-w-prose whitespace-pre-wrap">{problem.description}</p>

      {problem.test_cases.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Examples</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {problem.test_cases.map((testCase) => (
              <dl key={testCase.id} className="grid grid-cols-2 gap-2 rounded border border-line bg-white p-3">
                <div className="min-w-0">
                  <dt className="text-xs text-muted">Input</dt>
                  <dd>
                    <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap font-mono text-sm">{testCase.input}</pre>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">Expected output</dt>
                  <dd>
                    <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap font-mono text-sm">{testCase.expected_output}</pre>
                  </dd>
                </div>
              </dl>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <label htmlFor={languageId} className="text-sm font-medium">
          Language
        </label>
        <select
          id={languageId}
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
          className="ml-2 rounded border border-line bg-white px-2 py-1 text-sm hover:border-muted"
        >
          {LANGUAGES.map((option) => (
            <option key={option} value={option}>
              {LANGUAGE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-hidden rounded border border-line bg-white">
        <Editor
          height="280px"
          language={language}
          value={code[language]}
          onChange={(value) => setCode((current) => ({ ...current, [language]: value ?? '' }))}
          loading={<p className="p-4 text-sm text-muted">Loading editor...</p>}
          options={{
            ariaLabel: `${LANGUAGE_LABELS[language]} code for ${problem.title}`,
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>
      {language === 'java' && <p className="mt-1 text-sm text-muted">The Java class must be named Main.</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {user ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Running tests...' : 'Submit'}
          </button>
        ) : (
          <Link
            to="/login"
            state={{ from: location }}
            className="rounded border border-accent px-4 py-2 font-medium text-accent hover:bg-accent-soft"
          >
            Log in to submit
          </Link>
        )}
        {error && (
          <p role="alert" className="text-sm text-fail">
            {error}
          </p>
        )}
      </div>

      {result && <SubmitResultPanel result={result} />}
    </article>
  )
}
