import Editor from '@monaco-editor/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { ApiError, LANGUAGES, submitSolution, type Language, type Problem, type SubmitResult } from '../api'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { LANGUAGE_LABELS, STARTER_CODE } from '../starters'
import Content from './Content'
import { TextWithCode } from './LessonBody'
import SubmitResultPanel from './SubmitResultPanel'

// The statement, examples, editor and Submit for one problem. Shared by the lesson page
// (inside ProblemCard) and the challenge page; each page renders its own title above it.
export default function ProblemSolver({
  problem,
  examplesHeading: ExamplesHeading = 'h3',
  onPassed,
}: {
  problem: Problem
  examplesHeading?: 'h2' | 'h3'
  onPassed?: (result: SubmitResult) => void
}) {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuth()
  const { dark } = useTheme()
  const location = useLocation()
  const [language, setLanguage] = useState<Language>('python')
  // Code is kept per language, so switching languages doesn't lose what was typed.
  const [code, setCode] = useState<Record<Language, string>>({ ...STARTER_CODE })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SubmitResult | null>(null)

  const languageId = `language-${problem.id}`
  const hintId = `editor-hint-${problem.id}`

  async function handleSubmit() {
    setBusy(true)
    setError('')
    try {
      const submitted = await submitSolution(problem.id, language, code[language])
      setResult(submitted)
      if (submitted.status === 'passed') {
        // Update the points in the header.
        refreshUser().catch(() => {})
        onPassed?.(submitted)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(Object.values(err.fieldErrors).flat().join(' ') || err.message)
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Content lang={problem.description_lang} as="p" className="mt-3 max-w-prose whitespace-pre-wrap">
        <TextWithCode text={problem.description} />
      </Content>

      {problem.test_cases.length > 0 && (
        <div className="mt-5">
          <ExamplesHeading className="text-sm font-medium">{t('solver.examples')}</ExamplesHeading>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {problem.test_cases.map((testCase) => (
              <dl key={testCase.id} className="grid grid-cols-2 gap-2 rounded border border-line bg-surface p-3">
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{t('solver.input')}</dt>
                  <dd>
                    <pre dir="ltr" lang="en" className="mt-0.5 w-fit max-w-full overflow-x-auto whitespace-pre-wrap font-mono text-sm">{testCase.input}</pre>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{t('solver.expectedOutput')}</dt>
                  <dd>
                    <pre dir="ltr" lang="en" className="mt-0.5 w-fit max-w-full overflow-x-auto whitespace-pre-wrap font-mono text-sm">{testCase.expected_output}</pre>
                  </dd>
                </div>
              </dl>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <label htmlFor={languageId} className="text-sm font-medium">
          {t('solver.language')}
        </label>
        <select
          id={languageId}
          value={language}
          onChange={(event) => setLanguage(event.target.value as Language)}
          className="ms-2 rounded border border-field bg-surface px-2 py-1 text-sm hover:border-muted"
        >
          {LANGUAGES.map((option) => (
            <option key={option} value={option}>
              {LANGUAGE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {/* Code is always left to right, in both interface languages. */}
      <div dir="ltr" className="mt-3 overflow-hidden rounded border border-line bg-surface">
        <Editor
          height="280px"
          language={language}
          // Changing the theme restyles the open editor; it is not remounted, so the code stays.
          theme={dark ? 'vs-dark' : 'vs'}
          value={code[language]}
          onChange={(value) => setCode((current) => ({ ...current, [language]: value ?? '' }))}
          // Screen readers read the Tab hint with the editor.
          onMount={(editor) => editor.getDomNode()?.querySelector('textarea, .native-edit-context')?.setAttribute('aria-describedby', hintId)}
          loading={<p className="p-4 text-sm text-muted">{t('solver.loadingEditor')}</p>}
          options={{
            ariaLabel: t('solver.editorLabel', { language: LANGUAGE_LABELS[language], title: problem.title }),
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>
      <p id={hintId} className="mt-1 text-sm text-muted">
        <TextWithCode text={t('solver.tabHint')} />
      </p>
      {language === 'java' && (
        <p className="mt-1 text-sm text-muted">
          <TextWithCode text={t('solver.javaMain')} />
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {user ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="rounded bg-accent px-4 py-2 font-medium text-inverse hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('solver.running') : t('solver.submit')}
          </button>
        ) : (
          <Link
            to="/login"
            state={{ from: location }}
            className="rounded border border-accent px-4 py-2 font-medium text-accent hover:bg-accent-soft"
          >
            {t('solver.logInToSubmit')}
          </Link>
        )}
        {error && (
          <p role="alert" className="text-sm text-fail">
            {/* The server's message or field errors, in the page language; dir="auto" for safety. */}
            <span dir="auto">{error}</span>
          </p>
        )}
      </div>

      {result && <SubmitResultPanel result={result} />}
    </>
  )
}
