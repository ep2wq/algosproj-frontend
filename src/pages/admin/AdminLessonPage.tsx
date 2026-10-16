import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, createLesson, deleteLesson, getAdminLesson, getAdminModules, updateLesson, type LessonInput, type Module } from '../../api'
import DeleteButton from '../../components/DeleteButton'
import Field from '../../components/Field'
import LessonBody from '../../components/LessonBody'
import TextAreaField from '../../components/TextAreaField'
import { alertClass, primaryButton, selectClass } from './styles'

// /admin/lessons/new?module=<id> and /admin/lessons/:id
export default function AdminLessonPage() {
  const { id } = useParams()
  const lessonId = id === undefined ? null : Number(id)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [modules, setModules] = useState<Module[]>([])
  const [form, setForm] = useState<LessonInput | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('')
  const moduleParam = searchParams.get('module')

  useEffect(() => {
    Promise.all([getAdminModules(), lessonId === null ? null : getAdminLesson(lessonId)])
      .then(([moduleList, lesson]) => {
        setModules(moduleList)
        if (lesson) {
          setForm({
            module_id: lesson.module_id,
            title: lesson.title,
            slug: lesson.slug,
            body: lesson.body ?? '',
            sort_order: String(lesson.sort_order),
          })
          return
        }
        const module = moduleList.find((item) => String(item.id) === moduleParam) ?? null
        const next = Math.max(0, ...(module?.lessons ?? []).map((lessonItem) => lessonItem.sort_order)) + 1
        setForm({ module_id: module?.id ?? null, title: '', slug: '', body: '', sort_order: String(next) })
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setLoadError("This lesson doesn't exist.")
        else setLoadError(err instanceof ApiError ? err.message : 'Could not load the lesson.')
      })
  }, [lessonId, moduleParam])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setBusy(true)
    setError('')
    setFieldErrors({})
    setNotice('')
    try {
      if (lessonId === null) {
        const created = await createLesson(form)
        // Same component for the new address, so it stays mounted; its effect loads the saved item.
        navigate(`/admin/lessons/${created.id}`, { replace: true })
        setNotice('Lesson created.')
      } else {
        await updateLesson(lessonId, form)
        setNotice('Saved.')
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFieldErrors(err.fieldErrors)
      setError(err instanceof ApiError ? err.message : 'Could not save. Try again.')
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
          Back to the content list
        </Link>
      </div>
    )
  }

  if (!form) return <p className="text-muted">Loading lesson...</p>

  const moduleErrors = fieldErrors.module_id

  return (
    <div>
      <Link to="/admin" className="rounded text-sm text-muted hover:text-accent">
        Content list
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{lessonId === null ? 'Add lesson' : 'Edit lesson'}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="module_id" className="block text-sm font-medium text-ink">
              Module
            </label>
            <select
              id="module_id"
              value={form.module_id ?? ''}
              onChange={(event) => setForm({ ...form, module_id: event.target.value ? Number(event.target.value) : null })}
              aria-invalid={Boolean(moduleErrors)}
              aria-describedby={moduleErrors ? 'module_id-error' : undefined}
              className={`${selectClass} ${moduleErrors ? 'border-fail' : 'border-field hover:border-muted'}`}
            >
              <option value="">Choose a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            {moduleErrors && (
              <p id="module_id-error" className="mt-1 text-sm text-fail">
                {moduleErrors.join(' ')}
              </p>
            )}
          </div>
          <Field
            id="sort_order"
            label="Order in the module"
            type="number"
            value={form.sort_order}
            onChange={(sort_order) => setForm({ ...form, sort_order })}
            errors={fieldErrors.sort_order}
          />
          <Field id="title" label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} errors={fieldErrors.title} />
          <Field
            id="slug"
            label="Slug (lowercase letters, digits and hyphens)"
            value={form.slug}
            onChange={(slug) => setForm({ ...form, slug })}
            errors={fieldErrors.slug}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <TextAreaField
              id="body"
              label="Body (## headings, - lists, 4-space code, paragraphs)"
              value={form.body}
              onChange={(body) => setForm({ ...form, body })}
              rows={24}
              errors={fieldErrors.body}
            />
            <p className="mt-1 text-sm text-muted tabular-nums">{form.body.length} of 20,000 characters</p>
          </div>
          <section aria-labelledby="preview-heading" className="min-w-0">
            <h2 id="preview-heading" className="text-sm font-medium text-ink">
              Preview
            </h2>
            <div className="mt-1 rounded border border-line bg-paper p-4">
              {form.body.trim() ? <LessonBody text={form.body} /> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
            </div>
          </section>
        </div>

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
          {busy ? 'Saving...' : lessonId === null ? 'Create lesson' : 'Save lesson'}
        </button>
      </form>

      {lessonId !== null && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-semibold">Delete this lesson</h2>
          <p className="mt-1 text-sm text-muted">Only a lesson without problems can be deleted.</p>
          <div className="mt-3">
            <DeleteButton
              what="this lesson"
              onConfirm={async () => {
                await deleteLesson(lessonId)
                navigate('/admin', { replace: true })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
