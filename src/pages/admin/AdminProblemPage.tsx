import type { TFunction } from 'i18next'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  createProblem,
  createTestCase,
  deleteProblem,
  deleteTestCase,
  getAdminModules,
  getAdminProblem,
  getTestCases,
  updateProblem,
  updateTestCase,
  type AdminTestCase,
  type Module,
  type ProblemInput,
  type TestCaseInput,
} from '../../api'
import DeleteButton from '../../components/DeleteButton'
import Field from '../../components/Field'
import TextAreaField from '../../components/TextAreaField'
import { alertClass, primaryButton, secondaryButton, selectClass } from './styles'

const POINTS: Record<string, number> = { easy: 10, medium: 20, hard: 30 }
// Long tests are cut short in the table; the edit form shows them in full.
const PREVIEW_LENGTH = 200

function preview(text: string, t: TFunction): string {
  return text.length > PREVIEW_LENGTH ? t('admin.problem.preview', { start: text.slice(0, PREVIEW_LENGTH), length: text.length }) : text
}

// The add and edit form for one test case.
function TestCaseForm({
  idPrefix,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  idPrefix: string
  initial: TestCaseInput
  submitLabel: string
  onSave: (data: TestCaseInput) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await onSave(form)
      setForm(initial)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFieldErrors(err.fieldErrors)
      setError(err instanceof ApiError ? err.message : t('admin.problem.testSaveFailed'))
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <TextAreaField
          id={`${idPrefix}-input`}
          label={t('admin.problem.inputLabel')}
          value={form.input}
          onChange={(input) => setForm({ ...form, input })}
          errors={fieldErrors.input}
        />
        <TextAreaField
          id={`${idPrefix}-expected`}
          label={t('admin.problem.expectedLabel')}
          value={form.expected_output}
          onChange={(expected_output) => setForm({ ...form, expected_output })}
          errors={fieldErrors.expected_output}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-hidden`}
          type="checkbox"
          checked={form.is_hidden}
          onChange={(event) => setForm({ ...form, is_hidden: event.target.checked })}
          className="h-4 w-4"
        />
        <label htmlFor={`${idPrefix}-hidden`} className="text-sm">
          {t('admin.problem.hiddenLabel')}
        </label>
      </div>
      {error && (
        <p role="alert" className={`text-sm ${alertClass}`}>
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? t('admin.common.saving') : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButton}>
            {t('admin.common.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}

function TestCases({ problemId }: { problemId: number }) {
  const { t } = useTranslation()
  const [testCases, setTestCases] = useState<AdminTestCase[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    getTestCases(problemId)
      .then(setTestCases)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : t('admin.problem.testsLoadFailed')))
  }, [problemId, t])

  if (loadError) {
    return (
      <p role="alert" className={`mt-4 ${alertClass}`}>
        {loadError}
      </p>
    )
  }
  if (!testCases) return <p className="mt-4 text-muted">{t('admin.problem.testsLoading')}</p>

  const editing = testCases.find((testCase) => testCase.id === editingId) ?? null
  const totalBytes = testCases.reduce(
    (sum, testCase) => sum + new TextEncoder().encode(testCase.input + testCase.expected_output).length,
    0,
  )

  return (
    <>
      <p className="mt-2 text-sm text-muted tabular-nums">{t('admin.problem.testsSummary', { tests: testCases.length, bytes: totalBytes.toLocaleString('en') })}</p>

      {testCases.length > 0 && (
        <div className="mt-4 rounded border border-line bg-surface">
          <table className="w-full table-fixed text-start text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="w-8 px-2 py-2 font-medium sm:w-12 sm:px-3">
                  #
                </th>
                <th scope="col" className="px-2 py-2 font-medium sm:px-3">
                  {t('admin.problem.input')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium sm:px-3">
                  {t('admin.problem.expected')}
                </th>
                <th scope="col" className="w-16 px-2 py-2 font-medium sm:w-20 sm:px-3">
                  {t('admin.problem.hidden')}
                </th>
                <th scope="col" className="w-20 px-2 py-2 font-medium sm:w-24 sm:px-3">
                  <span className="sr-only">{t('admin.problem.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {testCases.map((testCase, index) => (
                <tr key={testCase.id} className={testCase.id === editingId ? 'bg-accent-soft' : undefined}>
                  <td className="px-2 py-2 tabular-nums sm:px-3">{index + 1}</td>
                  <td className="px-2 py-2 sm:px-3">
                    <pre className="max-h-32 overflow-y-auto font-mono text-xs break-all whitespace-pre-wrap">{preview(testCase.input, t)}</pre>
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <pre className="max-h-32 overflow-y-auto font-mono text-xs break-all whitespace-pre-wrap">
                      {preview(testCase.expected_output, t)}
                    </pre>
                  </td>
                  <td className="px-2 py-2 sm:px-3">{testCase.is_hidden ? t('admin.common.yes') : t('admin.common.no')}</td>
                  <td className="space-y-2 px-2 py-2 sm:px-3">
                    <button type="button" onClick={() => setEditingId(testCase.id)} className={secondaryButton}>
                      {t('admin.common.edit')}
                      <span className="sr-only"> {t('admin.problem.testNumber', { number: index + 1 })}</span>
                    </button>
                    <DeleteButton
                      what={t('admin.problem.testNumber', { number: index + 1 })}
                      onConfirm={async () => {
                        await deleteTestCase(problemId, testCase.id)
                        setTestCases(testCases.filter((item) => item.id !== testCase.id))
                        if (editingId === testCase.id) setEditingId(null)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <section className="mt-6 rounded border border-line bg-surface p-4" aria-labelledby="edit-test-heading">
          <h3 id="edit-test-heading" className="font-semibold">
            {t('admin.problem.editTest', { number: testCases.indexOf(editing) + 1 })}
          </h3>
          <div className="mt-3">
            <TestCaseForm
              key={editing.id}
              idPrefix={`test-${editing.id}`}
              initial={{ input: editing.input, expected_output: editing.expected_output, is_hidden: editing.is_hidden }}
              submitLabel={t('admin.problem.saveTest')}
              onCancel={() => setEditingId(null)}
              onSave={async (data) => {
                const saved = await updateTestCase(problemId, editing.id, data)
                setTestCases(testCases.map((item) => (item.id === saved.id ? saved : item)))
                setEditingId(null)
              }}
            />
          </div>
        </section>
      )}

      <section className="mt-6 rounded border border-line bg-surface p-4" aria-labelledby="add-test-heading">
        <h3 id="add-test-heading" className="font-semibold">
          {t('admin.problem.addTestTitle')}
        </h3>
        <div className="mt-3">
          <TestCaseForm
            idPrefix="new-test"
            initial={{ input: '', expected_output: '', is_hidden: false }}
            submitLabel={t('admin.problem.addTest')}
            onSave={async (data) => {
              const created = await createTestCase(problemId, data)
              setTestCases([...testCases, created])
            }}
          />
        </div>
      </section>
    </>
  )
}

// /admin/problems/new?lesson=<id> and /admin/problems/:id
export default function AdminProblemPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const problemId = id === undefined ? null : Number(id)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [modules, setModules] = useState<Module[]>([])
  const [form, setForm] = useState<ProblemInput | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('')
  const lessonParam = searchParams.get('lesson')

  useEffect(() => {
    Promise.all([getAdminModules(), problemId === null ? null : getAdminProblem(problemId)])
      .then(([moduleList, problem]) => {
        setModules(moduleList)
        if (problem) {
          setForm({
            lesson_id: problem.lesson_id,
            title: problem.title,
            title_ar: problem.title_ar ?? '',
            slug: problem.slug ?? '',
            description: problem.description,
            description_ar: problem.description_ar ?? '',
            difficulty: problem.difficulty,
          })
          return
        }
        setForm({
          lesson_id: lessonParam ? Number(lessonParam) : null,
          title: '',
          title_ar: '',
          slug: '',
          description: '',
          description_ar: '',
          difficulty: 'easy',
        })
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setLoadError(t('admin.problem.notFound'))
        else setLoadError(err instanceof ApiError ? err.message : t('admin.problem.loadFailed'))
      })
  }, [problemId, lessonParam, t])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setBusy(true)
    setError('')
    setFieldErrors({})
    setNotice('')
    try {
      if (problemId === null) {
        const created = await createProblem(form)
        // Same component for the new address, so it stays mounted; its effect loads the saved item.
        navigate(`/admin/problems/${created.id}`, { replace: true })
        setNotice(t('admin.problem.created'))
      } else {
        await updateProblem(problemId, form)
        setNotice(t('admin.common.saved'))
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFieldErrors(err.fieldErrors)
      setError(err instanceof ApiError ? err.message : t('admin.common.saveFailed'))
    }
    setBusy(false)
  }

  if (loadError) {
    return (
      <div className="max-w-prose">
        <p role="alert" className={alertClass}>
          {loadError}
        </p>
        <Link to="/admin" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          {t('admin.common.backToContent')}
        </Link>
      </div>
    )
  }

  if (!form) return <p className="text-muted">{t('admin.problem.loading')}</p>

  const lessonErrors = fieldErrors.lesson_id
  const difficultyErrors = fieldErrors.difficulty

  return (
    <div className="max-w-4xl">
      <Link to="/admin" className="rounded text-sm text-muted hover:text-accent">
        {t('admin.common.contentList')}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{problemId === null ? t('admin.problem.add') : t('admin.problem.edit')}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="title" label={t('admin.fields.title')} value={form.title} onChange={(title) => setForm({ ...form, title })} errors={fieldErrors.title} />
          <Field
            id="slug"
            label={t('admin.fields.slug')}
            value={form.slug}
            onChange={(slug) => setForm({ ...form, slug })}
            errors={fieldErrors.slug}
          />
          <div className="sm:col-start-1">
            <Field
              id="title_ar"
              label={t('admin.fields.titleAr')}
              value={form.title_ar}
              onChange={(title_ar) => setForm({ ...form, title_ar })}
              errors={fieldErrors.title_ar}
              required={false}
              dir="rtl"
              lang="ar"
            />
          </div>
          <div className="sm:col-start-1">
            <label htmlFor="lesson_id" className="block text-sm font-medium text-ink">
              {t('admin.fields.lesson')}
            </label>
            <select
              id="lesson_id"
              value={form.lesson_id ?? ''}
              onChange={(event) => setForm({ ...form, lesson_id: event.target.value ? Number(event.target.value) : null })}
              aria-invalid={Boolean(lessonErrors)}
              aria-describedby={lessonErrors ? 'lesson_id-error' : undefined}
              className={`${selectClass} ${lessonErrors ? 'border-fail' : 'border-field hover:border-muted'}`}
            >
              <option value="">{t('admin.problem.noLesson')}</option>
              {modules.map((module) => (
                <optgroup key={module.id} label={module.title}>
                  {module.lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {lessonErrors && (
              <p id="lesson_id-error" className="mt-1 text-sm text-fail">
                {lessonErrors.join(' ')}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-ink">
              {t('admin.fields.difficulty')}
            </label>
            <select
              id="difficulty"
              value={form.difficulty}
              onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
              aria-invalid={Boolean(difficultyErrors)}
              aria-describedby={difficultyErrors ? 'difficulty-error' : 'difficulty-points'}
              className={`${selectClass} ${difficultyErrors ? 'border-fail' : 'border-field hover:border-muted'}`}
            >
              <option value="easy">{t('admin.difficulty.easy')}</option>
              <option value="medium">{t('admin.difficulty.medium')}</option>
              <option value="hard">{t('admin.difficulty.hard')}</option>
            </select>
            {difficultyErrors ? (
              <p id="difficulty-error" className="mt-1 text-sm text-fail">
                {difficultyErrors.join(' ')}
              </p>
            ) : (
              <p id="difficulty-points" className="mt-1 text-sm text-muted">
                {t('admin.problem.worth', { points: POINTS[form.difficulty] ?? '?' })}
              </p>
            )}
          </div>
        </div>
        <TextAreaField
          id="description"
          label={t('admin.fields.description')}
          value={form.description}
          onChange={(description) => setForm({ ...form, description })}
          rows={12}
          errors={fieldErrors.description}
        />
        <p className="-mt-3 text-sm text-muted tabular-nums">{t('admin.problem.length', { length: form.description.length })}</p>
        <TextAreaField
          id="description_ar"
          label={t('admin.fields.descriptionAr')}
          value={form.description_ar}
          onChange={(description_ar) => setForm({ ...form, description_ar })}
          rows={12}
          errors={fieldErrors.description_ar}
          dir="rtl"
          lang="ar"
        />
        <p className="-mt-3 text-sm text-muted tabular-nums">{t('admin.problem.length', { length: form.description_ar.length })}</p>

        {error && (
          <p role="alert" className={alertClass}>
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-pass">
            {notice}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? t('admin.common.saving') : problemId === null ? t('admin.problem.create') : t('admin.problem.save')}
        </button>
      </form>

      <section className="mt-10 border-t border-line pt-6" aria-labelledby="tests-heading">
        <h2 id="tests-heading" className="text-xl font-semibold">
          {t('admin.problem.testsTitle')}
        </h2>
        {problemId === null ? (
          <p className="mt-2 text-muted">{t('admin.problem.createFirst')}</p>
        ) : (
          <TestCases problemId={problemId} />
        )}
      </section>

      {problemId !== null && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-semibold">{t('admin.problem.deleteTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('admin.problem.deleteRule')}</p>
          <div className="mt-3">
            <DeleteButton
              what={t('admin.problem.this')}
              onConfirm={async () => {
                await deleteProblem(problemId)
                navigate('/admin', { replace: true })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
