import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, createModule, deleteModule, getAdminModules, updateModule, type ModuleInput } from '../../api'
import DeleteButton from '../../components/DeleteButton'
import Field from '../../components/Field'
import { alertClass, primaryButton } from './styles'

// /admin/modules/new and /admin/modules/:id
export default function AdminModulePage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const moduleId = id === undefined ? null : Number(id)
  const navigate = useNavigate()
  const [form, setForm] = useState<ModuleInput | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    // There is no single-module endpoint; the list is small.
    getAdminModules()
      .then((modules) => {
        if (moduleId === null) {
          const next = Math.max(0, ...modules.map((module) => module.sort_order)) + 1
          setForm({ title: '', title_ar: '', slug: '', sort_order: String(next) })
          return
        }
        const module = modules.find((item) => item.id === moduleId)
        if (!module) {
          setLoadError(t('admin.module.notFound'))
          return
        }
        setForm({ title: module.title, title_ar: module.title_ar ?? '', slug: module.slug, sort_order: String(module.sort_order) })
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : t('admin.module.loadFailed')))
  }, [moduleId, t])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setBusy(true)
    setError('')
    setFieldErrors({})
    setNotice('')
    try {
      if (moduleId === null) {
        const created = await createModule(form)
        // Same component for the new address, so it stays mounted; its effect loads the saved item.
        navigate(`/admin/modules/${created.id}`, { replace: true })
        setNotice(t('admin.module.created'))
      } else {
        await updateModule(moduleId, form)
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

  if (!form) return <p className="text-muted">{t('admin.module.loading')}</p>

  return (
    <div className="max-w-xl">
      <Link to="/admin" className="rounded text-sm text-muted hover:text-accent">
        {t('admin.common.contentList')}
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{moduleId === null ? t('admin.module.add') : t('admin.module.edit')}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field id="title" label={t('admin.fields.title')} value={form.title} onChange={(title) => setForm({ ...form, title })} errors={fieldErrors.title} />
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
        <Field
          id="slug"
          label={t('admin.fields.slug')}
          value={form.slug}
          onChange={(slug) => setForm({ ...form, slug })}
          errors={fieldErrors.slug}
        />
        <Field
          id="sort_order"
          label={t('admin.fields.order')}
          type="number"
          value={form.sort_order}
          onChange={(sort_order) => setForm({ ...form, sort_order })}
          errors={fieldErrors.sort_order}
        />
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
          {busy ? t('admin.common.saving') : moduleId === null ? t('admin.module.create') : t('admin.module.save')}
        </button>
      </form>

      {moduleId !== null && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-semibold">{t('admin.module.deleteTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('admin.module.deleteRule')}</p>
          <div className="mt-3">
            <DeleteButton
              what={t('admin.module.this')}
              onConfirm={async () => {
                await deleteModule(moduleId)
                navigate('/admin', { replace: true })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
