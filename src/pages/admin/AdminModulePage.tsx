import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, createModule, deleteModule, getAdminModules, updateModule, type ModuleInput } from '../../api'
import DeleteButton from '../../components/DeleteButton'
import Field from '../../components/Field'
import { alertClass, primaryButton } from './styles'

// /admin/modules/new and /admin/modules/:id
export default function AdminModulePage() {
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
          setLoadError("This module doesn't exist.")
          return
        }
        setForm({ title: module.title, title_ar: module.title_ar ?? '', slug: module.slug, sort_order: String(module.sort_order) })
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load the module.'))
  }, [moduleId])

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
        setNotice('Module created.')
      } else {
        await updateModule(moduleId, form)
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

  if (!form) return <p className="text-muted">Loading module...</p>

  return (
    <div className="max-w-xl">
      <Link to="/admin" className="rounded text-sm text-muted hover:text-accent">
        Content list
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{moduleId === null ? 'Add module' : 'Edit module'}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field id="title" label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} errors={fieldErrors.title} />
        <Field
          id="title_ar"
          label="Title (Arabic)"
          value={form.title_ar}
          onChange={(title_ar) => setForm({ ...form, title_ar })}
          errors={fieldErrors.title_ar}
          required={false}
          dir="rtl"
          lang="ar"
        />
        <Field
          id="slug"
          label="Slug (lowercase letters, digits and hyphens)"
          value={form.slug}
          onChange={(slug) => setForm({ ...form, slug })}
          errors={fieldErrors.slug}
        />
        <Field
          id="sort_order"
          label="Order"
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
          {busy ? 'Saving...' : moduleId === null ? 'Create module' : 'Save module'}
        </button>
      </form>

      {moduleId !== null && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-semibold">Delete this module</h2>
          <p className="mt-1 text-sm text-muted">Only a module without lessons can be deleted.</p>
          <div className="mt-3">
            <DeleteButton
              what="this module"
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
