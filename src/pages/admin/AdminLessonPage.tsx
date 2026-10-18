import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, createLesson, deleteLesson, getAdminLesson, getAdminModules, updateLesson, type LessonInput, type Module } from '../../api'
import DeleteButton from '../../components/DeleteButton'
import Field from '../../components/Field'
import LessonBody from '../../components/LessonBody'
import TextAreaField from '../../components/TextAreaField'
import { alertClass, primaryButton, selectClass } from './styles'

// /admin/lessons/new?module=<id> and /admin/lessons/:id
export default function AdminLessonPage() {
  const { t } = useTranslation()
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
            title_ar: lesson.title_ar ?? '',
            slug: lesson.slug,
            body: lesson.body ?? '',
            body_ar: lesson.body_ar ?? '',
            sort_order: String(lesson.sort_order),
          })
          return
        }
        const module = moduleList.find((item) => String(item.id) === moduleParam) ?? null
        const next = Math.max(0, ...(module?.lessons ?? []).map((lessonItem) => lessonItem.sort_order)) + 1
        setForm({ module_id: module?.id ?? null, title: '', title_ar: '', slug: '', body: '', body_ar: '', sort_order: String(next) })
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setLoadError(t('admin.lesson.notFound'))
        else setLoadError(err instanceof ApiError ? err.message : t('admin.lesson.loadFailed'))
      })
  }, [lessonId, moduleParam, t])

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
        setNotice(t('admin.lesson.created'))
      } else {
        await updateLesson(lessonId, form)
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

  if (!form) return <p className="text-muted">{t('admin.lesson.loading')}</p>

  const moduleErrors = fieldErrors.module_id

  return (
    <div>
      <Link to="/admin" className="rounded text-sm text-muted hover:text-accent">
        {t('admin.common.contentList')}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{lessonId === null ? t('admin.lesson.add') : t('admin.lesson.edit')}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="module_id" className="block text-sm font-medium text-ink">
              {t('admin.fields.module')}
            </label>
            <select
              id="module_id"
              value={form.module_id ?? ''}
              onChange={(event) => setForm({ ...form, module_id: event.target.value ? Number(event.target.value) : null })}
              aria-invalid={Boolean(moduleErrors)}
              aria-describedby={moduleErrors ? 'module_id-error' : undefined}
              className={`${selectClass} ${moduleErrors ? 'border-fail' : 'border-field hover:border-muted'}`}
            >
              <option value="">{t('admin.lesson.chooseModule')}</option>
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
            label={t('admin.fields.orderInModule')}
            type="number"
            value={form.sort_order}
            onChange={(sort_order) => setForm({ ...form, sort_order })}
            errors={fieldErrors.sort_order}
          />
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <TextAreaField
              id="body"
              label={t('admin.fields.body')}
              value={form.body}
              onChange={(body) => setForm({ ...form, body })}
              rows={24}
              errors={fieldErrors.body}
            />
            <p className="mt-1 text-sm text-muted tabular-nums">{t('admin.lesson.length', { length: form.body.length })}</p>
          </div>
          <section aria-labelledby="preview-heading" className="min-w-0">
            <h2 id="preview-heading" className="text-sm font-medium text-ink">
              {t('admin.lesson.preview')}
            </h2>
            <div className="mt-1 rounded border border-line bg-paper p-4">
              {form.body.trim() ? <LessonBody text={form.body} lang="en" /> : <p className="text-sm text-muted">{t('admin.lesson.nothingToPreview')}</p>}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <TextAreaField
              id="body_ar"
              label={t('admin.fields.bodyAr')}
              value={form.body_ar}
              onChange={(body_ar) => setForm({ ...form, body_ar })}
              rows={24}
              errors={fieldErrors.body_ar}
              dir="rtl"
              lang="ar"
            />
            <p className="mt-1 text-sm text-muted">
              {t('admin.lesson.termsHint')}{' '}
              <span lang="ar" dir="rtl">
                {t('admin.lesson.termsExample')}
              </span>
              {t('admin.lesson.termsHintEnd')}
            </p>
            <p className="mt-1 text-sm text-muted tabular-nums">{t('admin.lesson.length', { length: form.body_ar.length })}</p>
          </div>
          <section aria-labelledby="preview-ar-heading" className="min-w-0">
            <h2 id="preview-ar-heading" className="text-sm font-medium text-ink">
              {t('admin.lesson.previewAr')}
            </h2>
            {/* dir="rtl" as on the Arabic site, so the preview matches what users see. */}
            <div dir="rtl" className="mt-1 rounded border border-line bg-paper p-4">
              {form.body_ar.trim() ? (
                <LessonBody text={form.body_ar} lang="ar" />
              ) : (
                <p lang="en" dir="ltr" className="text-sm text-muted">
                  {t('admin.lesson.nothingToPreview')}
                </p>
              )}
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
          {busy ? t('admin.common.saving') : lessonId === null ? t('admin.lesson.create') : t('admin.lesson.save')}
        </button>
      </form>

      {lessonId !== null && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-semibold">{t('admin.lesson.deleteTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('admin.lesson.deleteRule')}</p>
          <div className="mt-3">
            <DeleteButton
              what={t('admin.lesson.this')}
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
