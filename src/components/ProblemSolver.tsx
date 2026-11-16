import MonacoEditor, { loader } from '@monaco-editor/react'
import { Fragment, lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, LANGUAGES, submitSolution, type Language, type Problem, type SubmitResult, type User } from '../api'
import { useAuth } from '../auth'
import { readCodeLang, saveCodeLang } from '../codeLang'
import { reducedMotion } from '../motion'
import { setProblemSource } from '../reportBug'
import { isApple } from '../shortcuts'
import { play } from '../sound'
import { defineMonacoThemes, monacoThemeName } from '../monacoTheme'
import { useTheme } from '../theme'
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { LANGUAGE_LABELS, STARTER_CODE } from '../starters'
import Content from './Content'
import { CellLoader } from './Loading'
import ReportProblemButton from './ReportProblemButton'
import { TextWithCode } from './LessonBody'
import ResendVerification from './ResendVerification'
import SubmitResultPanel from './SubmitResultPanel'

// Between the keys of the shortcut hint.
const PLUS = '+'

// A description line that is only one of these labels is shown as a small heading (display only;
// Arabic descriptions mark them as English terms).
const STATEMENT_LABEL = /^(~(Input|Output|Constraints)~|Input|Output|Constraints)$/

// Monaco is bundled with the app (src/monaco.ts) and loaded only when an editor shows; the editor
// then uses it instead of fetching Monaco from a CDN. If the download fails the editor stays on its
// loading line (as it did when the CDN failed) instead of the error taking down the whole page.
const Editor = lazy(() =>
  import('../monaco')
    .then(({ monaco }) => {
      loader.config({ monaco })
      return { default: MonacoEditor }
    })
    .catch(() => new Promise<never>(() => {})),
)

// The statement, examples, editor and Submit for one problem. Shared by the lesson page
// (inside ProblemCard) and the challenge page; each page renders its own title above it.
// deferEditor (the lesson page, where the editor comes after the lesson text): Monaco is only
// downloaded when the editor area comes within 400 px of the screen or gets focus (Tab, click).
export default function ProblemSolver({
  problem,
  examplesHeading: ExamplesHeading = 'h3',
  onPassed,
  deferEditor = false,
}: {
  problem: Problem
  examplesHeading?: 'h2' | 'h3'
  onPassed?: (result: SubmitResult) => void
  deferEditor?: boolean
}) {
  const { t } = useTranslation()
  const { user, loading, refreshUser } = useAuth()
  const { dark } = useTheme()
  const location = useLocation()
  const [language, setLanguage] = useState<Language>(() => readCodeLang() ?? 'python')
  // Code is kept per language, so switching languages doesn't lose what was typed.
  const [code, setCode] = useState<Record<Language, string>>({ ...STARTER_CODE })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // A failed submit that is not field feedback (503 sandbox busy, 429, 419, network): it gets "Report this problem".
  const [failure, setFailure] = useState<unknown>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  // Counts results, so the result panel can replay its pass moment for each new one.
  const [attempt, setAttempt] = useState(0)
  // Submitting needs a verified email. The server's 403 email_unverified also shows the
  // explanation, for the user object it was refused with (it may be out of date here; the refreshed
  // one decides from then on). The code stays in the editor either way.
  const [refusedUser, setRefusedUser] = useState<User | null>(null)
  const unverified = Boolean(user && (!user.email_verified || refusedUser === user))
  const unverifiedRef = useRef<HTMLDivElement>(null)
  // The deferred editor: whether Monaco is wanted yet, and whether the editor has started.
  const [editorWanted, setEditorWanted] = useState(!deferEditor)
  const [editorReady, setEditorReady] = useState(false)
  const editorAreaRef = useRef<HTMLDivElement>(null)

  // The theme's colours come from the CSS variables of the mode in effect (src/monacoTheme.ts), so
  // after a light/dark toggle the theme is defined again from the new values, then applied.
  const monacoRef = useRef<typeof Monaco | null>(null)
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    defineMonacoThemes(monaco, dark)
    monaco.editor.setTheme(monacoThemeName(dark))
  }, [dark])

  useEffect(() => {
    const area = editorAreaRef.current
    if (editorWanted || !area) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setEditorWanted(true)
    }, { rootMargin: '400px 0px' })
    observer.observe(area)
    return () => observer.disconnect()
  }, [editorWanted])

  // Each new result (never the first render): focus goes to its summary, which is how a screen
  // reader hears it, and the summary scrolls into view only as far as needed (smoothly, or at once
  // under reduced motion). The focus call itself does not scroll, and the editor keeps its place in
  // the page.
  const summaryRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const summary = summaryRef.current
    if (attempt === 0 || !summary) return
    summary.focus({ preventScroll: true })
    summary.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' })
  }, [attempt])

  // The Submit button just went away under the user's focus: move it to the explanation.
  useEffect(() => {
    if (refusedUser) unverifiedRef.current?.focus()
  }, [refusedUser])

  // What "my code and the problem" sends with a bug report from this page (problem slug = lesson slug).
  // The code is cut to the 20,000 characters the backend keeps: a full 64 KB submission would make the
  // part longer than its 60,000-character limit and the whole report would be refused.
  const { slug } = useParams()
  useEffect(
    () =>
      setProblemSource(() => ({
        slug: slug ?? null,
        language,
        code: code[language].slice(0, 20000),
        ...(result ? { result: { status: result.status, passed_count: result.passed_count, total_count: result.total_count, ...(result.compile_error ? { message: result.compile_error.slice(0, 300) } : {}) } } : {}),
      })),
    [slug, language, code, result],
  )

  const languageId = `language-${problem.id}`
  const hintId = `editor-hint-${problem.id}`
  // While Monaco's code downloads (Suspense) and while it starts (the editor's own loading slot).
  const editorLoading = <CellLoader label={t('solver.loadingEditor')} className="h-[280px] w-full" />
  const editorLabel = t('solver.editorLabel', { language: LANGUAGE_LABELS[language], title: problem.title })

  async function handleSubmit() {
    if (busy) return
    setBusy(true)
    setError('')
    setFailure(null)
    try {
      const submitted = await submitSolution(problem.id, language, code[language])
      setResult(submitted)
      setAttempt((count) => count + 1)
      // The result panel shows and announces the same outcome; the sound only accompanies it.
      play(submitted.status === 'passed' ? (submitted.points_awarded > 0 ? 'passPoints' : 'pass') : submitted.status === 'failed' ? 'fail' : 'error')
      if (submitted.status === 'passed') {
        // Update the points in the header.
        refreshUser().catch(() => {})
        onPassed?.(submitted)
      }
    } catch (err) {
      if (err instanceof ApiError && err.emailUnverified) {
        setRefusedUser(user)
        refreshUser().catch(() => {})
      } else if (err instanceof ApiError && err.status === 422) {
        setError(Object.values(err.fieldErrors).flat().join(' ') || err.message)
      } else {
        setError(err instanceof ApiError ? err.message : t('common.genericError'))
        setFailure(err)
      }
    } finally {
      setBusy(false)
    }
  }

  // Ctrl+Enter (Cmd+Enter on Apple devices) submits from anywhere in the editor block or the result,
  // the editor included: caught on the way down, so Monaco never gets it (it would add a line). It
  // does nothing while a submit is running, and nothing at all for a visitor who cannot submit.
  const canSubmit = !loading && user !== null && !unverified
  const apple = isApple()
  function handleShortcut(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.nativeEvent.isComposing) return
    if (apple ? !event.metaKey : !event.ctrlKey) return
    if (!canSubmit) return
    event.preventDefault()
    event.stopPropagation()
    if (!busy && !event.repeat) void handleSubmit()
  }

  return (
    <>
      <Content lang={problem.description_lang} as="div" className="mt-3 max-w-prose whitespace-pre-wrap">
        {/* Line by line, so a label line can be a heading. Inline code and ~term~ never span lines. */}
        {problem.description.split('\n').map((line, index, lines) =>
          STATEMENT_LABEL.test(line.trim()) ? (
            <ExamplesHeading key={index} className="text-sm font-semibold text-ink">
              <TextWithCode text={line.trim()} />
            </ExamplesHeading>
          ) : (
            <Fragment key={index}>
              <TextWithCode text={line} />
              {index < lines.length - 1 && '\n'}
            </Fragment>
          ),
        )}
      </Content>

      {problem.test_cases.length > 0 && (
        <div className="mt-5">
          <ExamplesHeading className="text-sm font-semibold">{t('solver.examples')}</ExamplesHeading>
          {/* In each example the input gets more room: on a phone an even split wraps a short line
              of numbers. */}
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {problem.test_cases.map((testCase) => (
              <dl key={testCase.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 rounded-lg border border-line bg-surface p-3">
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{t('solver.input')}</dt>
                  <dd>
                    <pre dir="ltr" lang="en" className="mt-1 w-fit max-w-full overflow-x-auto whitespace-pre-wrap rounded bg-code px-2 py-1 font-mono text-sm">{testCase.input}</pre>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{t('solver.expectedOutput')}</dt>
                  <dd>
                    <pre dir="ltr" lang="en" className="mt-1 w-fit max-w-full overflow-x-auto whitespace-pre-wrap rounded bg-code px-2 py-1 font-mono text-sm">{testCase.expected_output}</pre>
                  </dd>
                </div>
              </dl>
            ))}
          </div>
        </div>
      )}

      {/* The editor block and the result: Ctrl+Enter submits from anywhere in here. */}
      <div onKeyDownCapture={handleShortcut}>
      {/* One framed block: the language picker and the Tab hint in a strip above the editor, Submit in
          a strip under it. overflow-clip, not hidden: hidden would make this box the scroll container
          of the sticky strip. */}
      <div className="mt-6 overflow-clip rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-3 py-2">
          <div>
            <label htmlFor={languageId} className="text-sm font-medium">
              {t('solver.language')}
            </label>
            <select
              id={languageId}
              value={language}
              onChange={(event) => {
                const next = event.target.value as Language
                setLanguage(next)
                saveCodeLang(next)
              }}
              className="ms-2 rounded border border-field bg-surface px-2 py-1 text-sm hover:border-muted"
            >
              {LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {LANGUAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <p id={hintId} className="text-xs text-muted">
            <TextWithCode text={t('solver.tabHint')} />
          </p>
        </div>
        {/* Code is always left to right, in both interface languages. A deferred editor's box takes
            focus (Tab or a click) until the editor has started: focus loads it, and the editor then
            takes the focus. Before that it shows the editor's loading look, at the editor's size. */}
        <div
          ref={editorAreaRef}
          dir="ltr"
          {...(deferEditor && !editorReady
            ? { tabIndex: 0, role: 'group', 'aria-label': editorLabel, 'aria-describedby': hintId, 'aria-busy': editorWanted, onFocus: () => setEditorWanted(true) }
            : {})}
        >
          {!editorWanted ? (
            <CellLoader className="h-[280px] w-full" />
          ) : (
            <Suspense fallback={editorLoading}>
              <Editor
                height="280px"
                language={language}
                // Changing the theme restyles the open editor; it is not remounted, so the code stays.
                theme={monacoThemeName(dark)}
                beforeMount={(monaco) => {
                  monacoRef.current = monaco
                  defineMonacoThemes(monaco, dark)
                }}
                value={code[language]}
                onChange={(value) => setCode((current) => ({ ...current, [language]: value ?? '' }))}
                // Screen readers read the Tab hint with the editor.
                // Monaco measures the font once; measure again when JetBrains Mono has arrived.
                // The bundled Monaco sometimes skips the first paint of the scrollbar's overview ruler (its
                // border and cursor mark); one full render draws it as the CDN build did.
                onMount={(editor, monaco) => {
                  editor.getDomNode()?.querySelector('textarea, .native-edit-context')?.setAttribute('aria-describedby', hintId)
                  void document.fonts.load("14px 'JetBrains Mono'").then(() => monaco.editor.remeasureFonts())
                  requestAnimationFrame(() => editor.render(true))
                  // The user tabbed or clicked into the deferred editor's box while it loaded.
                  if (document.activeElement === editorAreaRef.current) editor.focus()
                  setEditorReady(true)
                }}
                loading={editorLoading}
                options={{
                  ariaLabel: editorLabel,
                  minimap: { enabled: false },
                  fontSize: 14,
                  // The --font-mono stack in src/index.css (Monaco can't read a CSS variable).
                  fontFamily: "'JetBrains Mono', 'Mono Fallback', 'IBM Plex Sans Arabic', monospace",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  // Suggestion popups are drawn over the page, not clipped by the editor's box.
                  fixedOverflowWidgets: true,
                  tabSize: 4,
                }}
              />
            </Suspense>
          )}
        </div>
        {/* Submit directly under the editor, on the end side, the largest control of the block. On a
            phone or touch screen the strip sticks to the bottom of the screen (above the cookie
            notice) for as long as the block is on screen: it is the same button, and it cannot leave
            the block, so it ends with it. Its height is kept while /me loads, so nothing jumps. */}
        <div className="z-10 flex min-h-[calc(3.75rem+1px)] flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-line bg-surface px-3 py-2 max-sm:sticky max-sm:bottom-[var(--cookie-h,0px)] pointer-coarse:sticky pointer-coarse:bottom-[var(--cookie-h,0px)]">
          {/* A failed submit, on the start side; it shakes once like a failed result. */}
          {(error || failure !== null) && (
            <div className="me-auto flex flex-wrap items-center gap-3">
              {error && (
                <p role="alert" className="text-sm text-fail motion-safe:animate-shake">
                  {/* The server's message or field errors, in the page language; dir="auto" for safety. */}
                  <span dir="auto">{error}</span>
                </p>
              )}
              {failure !== null && <ReportProblemButton error={failure} className="inline-flex min-h-11 items-center rounded border border-field bg-surface px-3 text-sm font-medium text-ink hover:border-muted sm:pointer-fine:min-h-9" />}
            </div>
          )}
          {/* Nothing while /me is still loading at startup, so a logged-in user never sees "Log in". */}
          {loading ? null : unverified ? (
            <div ref={unverifiedRef} tabIndex={-1} className="max-w-prose rounded-lg border border-line note-box px-3 py-2 text-sm text-ink">
              <p>{t('verify.submitBlocked')}</p>
              <ResendVerification />
            </div>
          ) : user ? (
            <>
              {/* The shortcut, where there is a keyboard. Keys stay Latin and left to right. */}
              <p className="text-xs text-muted max-sm:hidden pointer-coarse:hidden">
                <span className="sr-only">{t('solver.shortcutHint')} </span>
                <span dir="ltr" className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-field bg-surface px-1.5 py-0.5 font-mono">{apple ? t('shortcuts.cmd') : t('shortcuts.ctrl')}</kbd>
                  <span aria-hidden="true">{PLUS}</span>
                  <kbd className="rounded border border-field bg-surface px-1.5 py-0.5 font-mono">{t('shortcuts.enter')}</kbd>
                </span>
              </p>
              {/* Busy at once: the label changes and three cells pulse once, then rest (nothing
                  loops; they do not move under reduced motion). */}
              <button
                type="button"
                onClick={handleSubmit}
                aria-disabled={busy}
                aria-keyshortcuts={apple ? 'Meta+Enter' : 'Control+Enter'}
                className="elev-raised inline-flex min-h-11 items-center justify-center gap-2 rounded bg-accent px-6 font-semibold text-inverse hover:bg-accent/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:bg-accent"
              >
                {busy && (
                  <span aria-hidden="true" className="flex gap-0.5">
                    {[0, 1, 2].map((cell) => (
                      <span key={cell} className="size-1.5 rounded-sm bg-current motion-safe:animate-pulse-once" />
                    ))}
                  </span>
                )}
                {busy ? t('solver.running') : t('solver.submit')}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: location }}
              className="inline-flex min-h-11 items-center justify-center rounded border border-accent px-4 font-medium text-accent-text hover:bg-accent-soft motion-safe:active:translate-y-px"
            >
              {t('solver.logInToSubmit')}
            </Link>
          )}
        </div>
      </div>
      {language === 'java' && (
        <p className="mt-1 text-sm text-muted">
          <TextWithCode text={t('solver.javaMain')} />
        </p>
      )}

      {/* One polite line for a running submit; the result is announced by the focus it gets. */}
      <p role="status" className="sr-only">
        {busy ? t('solver.running') : ''}
      </p>
      {/* The result area takes its place as soon as Submit is pressed, so the result does not push
          anything when it arrives; while a later submit runs, the old result stays, dimmed. */}
      {result ? (
        <SubmitResultPanel result={result} attempt={attempt} heading={ExamplesHeading === 'h2' ? 'h3' : 'h4'} summaryRef={summaryRef} busy={busy} />
      ) : (
        busy && <CellLoader className="mt-4 h-16 rounded-lg border border-line bg-surface" />
      )}
      </div>
    </>
  )
}
