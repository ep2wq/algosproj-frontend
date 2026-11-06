import { ChevronRight, Code2, Pencil, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, getAdminModules, getAdminProblems, type AdminModule, type AdminProblem, type LessonSummary } from '../../api'
import ReportProblemButton from '../../components/ReportProblemButton'
import DifficultyBadge from '../../components/DifficultyBadge'
import FilterBar from '../../components/FilterBar'
import { AlertIcon } from '../../components/Icons'
import { rowLink } from '../../components/tableStyles'
import { VISUALS } from '../../visuals'
import { alertClass, secondaryButton } from './styles'

type ProblemSummary = Pick<AdminProblem, 'id' | 'lesson_id' | 'slug' | 'title' | 'difficulty' | 'points'>

// Up to this many modules open on load; with more, only the ones with a warning do.
const OPEN_ALL_UP_TO = 5

const STANDALONE = 'standalone'

// The health flags come only from what the admin lists already return (no request per row):
// a module without an Arabic title (title_ar), a lesson without problems, and, as information,
// whether a lesson's slug has a visualization (VISUALS). The lists carry no Arabic lesson or problem
// fields and no test cases, so those flags are not shown.
const moduleWarnings = (module: AdminModule) => (module.title_ar ? [] : (['flagNoArabicTitle'] as const))
const lessonWarnings = (problems: ProblemSummary[]) => (problems.length === 0 ? (['flagNoProblems'] as const) : [])

function Warning({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-xs font-medium text-warn">
      <AlertIcon className="size-3.5" />
      <span className="sr-only">{t('admin.content.warning')} </span>
      {children}
    </span>
  )
}

function Info({ children }: { children: ReactNode }) {
  return <span className="hidden shrink-0 items-center rounded border sm:inline-flex border-line px-1.5 py-0.5 text-xs text-muted">{children}</span>
}

// A small icon link at the end of a row: 44 px on touch, 32 px with a mouse. Shown on row hover,
// whenever focus is in the row, and always on touch screens; never hidden from the keyboard.
function RowAction({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded text-muted hover:bg-surface hover:text-ink sm:pointer-fine:size-8 pointer-fine:[.group:not(:hover,:focus-within)_&]:opacity-0"
    >
      {icon}
    </Link>
  )
}

function Chevron({ open, controls, title, onToggle }: { open: boolean; controls: string; title: string; onToggle: () => void }) {
  const { t } = useTranslation()
  const label = t(open ? 'admin.content.collapse' : 'admin.content.expand', { title })
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded text-muted hover:bg-surface hover:text-ink sm:pointer-fine:size-7"
    >
      <ChevronRight aria-hidden="true" className={`size-4 motion-safe:transition-transform ${open ? 'rotate-90' : ''}`} />
    </button>
  )
}

const rowClass = 'group flex min-h-11 items-center gap-2 border-t border-line pe-2 hover:bg-hover focus-within:bg-hover'
// Where a row without a chevron starts its text, so titles line up.
const spacer = <span aria-hidden="true" className="w-11 shrink-0 sm:pointer-fine:w-7" />

function ProblemRow({ problem }: { problem: ProblemSummary }) {
  const { t } = useTranslation()
  return (
    <li className={`${rowClass} ps-12 sm:ps-[6.75rem] sm:pointer-fine:ps-[5.75rem]`}>
      <Code2 aria-hidden="true" className="size-4 shrink-0 text-muted" />
      <Link to={`/admin/problems/${problem.id}`} title={problem.title} className={`${rowLink} min-w-0 py-2 sm:truncate`}>
        {problem.title}
      </Link>
      <span className="flex shrink-0 items-center gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        <span className="hidden font-mono text-xs text-muted tabular-nums sm:inline">{t('admin.content.points', { points: problem.points })}</span>
      </span>
      <span className="ms-auto flex shrink-0">
        <RowAction to={`/admin/problems/${problem.id}`} label={t('admin.content.editProblem', { title: problem.title })} icon={<Pencil aria-hidden="true" className="size-4" />} />
      </span>
    </li>
  )
}

// /admin: every module with its lessons and their problems, then the standalone problems, as one
// tree. Search and the "Needs attention" toggle live in the address (?q=, ?attention=1).
export default function AdminContentPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [modules, setModules] = useState<AdminModule[] | null>(null)
  const [problems, setProblems] = useState<ProblemSummary[]>([])
  const [error, setError] = useState('')
  // Ids of closed modules and lessons; null until the data is in and the defaults are set.
  const [closed, setClosed] = useState<Set<string> | null>(null)

  const q = params.get('q') ?? ''
  const attention = params.get('attention') === '1'
  const query = q.trim().toLowerCase()
  const filtering = Boolean(query) || attention

  useEffect(() => {
    Promise.all([getAdminModules(), getAdminProblems()])
      .then(([moduleList, problemList]) => {
        setModules(moduleList)
        setProblems(problemList)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.content.loadFailed')))
  }, [t])

  const problemsOf = (lessonId: string) => problems.filter((problem) => problem.lesson_id === lessonId)
  const standalone = problems.filter((problem) => problem.lesson_id === null)

  // Defaults once loaded: all open with up to 5 modules, otherwise only modules with a warning
  // (theirs or a lesson's). While a filter is applied everything matching is open.
  if (modules !== null && closed === null) {
    const flagged = (module: AdminModule) =>
      moduleWarnings(module).length > 0 || module.lessons.some((lesson) => lessonWarnings(problemsOf(lesson.id)).length > 0)
    setClosed(
      filtering || modules.length <= OPEN_ALL_UP_TO
        ? new Set()
        : new Set([...modules.filter((module) => !flagged(module)).map((module) => module.id), STANDALONE]),
    )
  }

  function setFilters(next: { q?: string; attention?: boolean }) {
    const merged = { q: next.q ?? q, attention: next.attention ?? attention }
    const values: Record<string, string> = {}
    if (merged.q) values.q = merged.q
    if (merged.attention) values.attention = '1'
    setParams(values, { replace: true })
    // A new filter shows every match: open everything.
    setClosed(new Set())
  }

  function toggle(id: string) {
    setClosed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const matches = (title: string, slug: string | null) =>
    !query || title.toLowerCase().includes(query) || (slug ?? '').toLowerCase().includes(query)
  // A row shows when it matches the search and, with "Needs attention", has a warning; or when one
  // of its children shows.
  const keep = (title: string, slug: string | null, warned: boolean) => matches(title, slug) && (!attention || warned)

  const lessonCount = modules?.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0
  const attentionCount =
    modules?.reduce(
      (sum, module) =>
        sum + (moduleWarnings(module).length > 0 ? 1 : 0) + module.lessons.filter((lesson) => lessonWarnings(problemsOf(lesson.id)).length > 0).length,
      0,
    ) ?? 0

  // The visible tree. A module or lesson that matches the search shows all its children; "Needs
  // attention" still hides the ones without a warning.
  const tree = (modules ?? []).flatMap((module) => {
    const moduleHit = matches(module.title, module.slug)
    const lessons = module.lessons.flatMap((lesson) => {
      const lessonProblems = problemsOf(lesson.id)
      const lessonHit = moduleHit || matches(lesson.title, lesson.slug)
      const shownProblems = lessonHit && !attention ? lessonProblems : lessonProblems.filter((problem) => keep(problem.title, problem.slug, false))
      const self = lessonHit && (!attention || lessonWarnings(lessonProblems).length > 0)
      if (!self && shownProblems.length === 0) return []
      return [{ lesson, lessonProblems, shownProblems }]
    })
    const self = keep(module.title, module.slug, moduleWarnings(module).length > 0)
    if (!self && lessons.length === 0) return []
    return [{ module, lessons }]
  })
  const shownStandalone = standalone.filter((problem) => keep(problem.title, problem.slug, false))
  const rowCount = tree.reduce((sum, { lessons }) => sum + 1 + lessons.reduce((s, l) => s + 1 + l.shownProblems.length, 0), 0) + shownStandalone.length
  const isOpen = (id: string) => !closed?.has(id)

  const allIds = () => [...(modules ?? []).flatMap((module) => [module.id, ...module.lessons.map((lesson) => lesson.id)]), STANDALONE]

  const toolButton =
    'inline-flex min-h-11 items-center rounded border border-field bg-surface px-2.5 text-sm text-ink hover:border-muted sm:pointer-fine:min-h-8'

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{t('admin.content.title')}</h1>
          <p className="mt-2 text-muted">{t('admin.content.intro')}</p>
        </div>
        {modules !== null && (
          <Link
            to="/admin/modules/new"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded bg-accent px-4 font-medium text-inverse hover:bg-accent/90 sm:pointer-fine:min-h-9"
          >
            {t('admin.content.addModule')}
            <Plus aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>

      {error && (
        <>
          <p role="alert" className={`mt-6 ${alertClass}`}>
            {error}
          </p>
          <ReportProblemButton context={{ message: error }} className={`mt-2 ${secondaryButton}`} />
        </>
      )}
      {!error && modules === null && <p className="mt-6 text-muted">{t('admin.content.loading')}</p>}

      {modules !== null && (
        <>
          <dl aria-label={t('admin.content.stats')} className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['modules', modules.length],
              ['lessons', lessonCount],
              ['problems', problems.length],
              ['needAttention', attentionCount],
            ].map(([key, value]) => {
              const warn = key === 'needAttention' && Number(value) > 0
              return (
                <div key={key} className={`rounded-lg border bg-surface px-3 py-2 ${warn ? 'border-warn/50' : 'border-line'}`}>
                  <dt className={`flex items-center gap-1 text-xs ${warn ? 'text-warn' : 'text-muted'}`}>
                    {warn && <AlertIcon className="size-3.5" />}
                    {t(`admin.content.${key}`)}
                  </dt>
                  <dd className={`mt-0.5 font-mono text-xl font-semibold tabular-nums ${warn ? 'text-warn' : 'text-ink'}`}>{value}</dd>
                </div>
              )
            })}
          </dl>

          <FilterBar
            label={t('admin.common.filters')}
            search={{ id: 'content-search', label: t('admin.content.search'), clearLabel: t('admin.common.clearSearch'), value: q, onChange: (value) => setFilters({ q: value }) }}
            extra={
              <>
                <button
                  type="button"
                  aria-pressed={attention}
                  onClick={() => setFilters({ attention: !attention })}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded border bg-surface px-2.5 text-sm text-ink hover:border-muted sm:pointer-fine:min-h-8 ${attention ? 'border-accent font-medium' : 'border-field'}`}
                >
                  <AlertIcon className={`size-4 ${attention ? 'text-warn' : 'text-muted'}`} />
                  {t('admin.content.needsAttention')}
                </button>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setClosed(new Set())} className={toolButton}>
                    {t('admin.content.expandAll')}
                  </button>
                  <button type="button" onClick={() => setClosed(new Set(allIds()))} className={toolButton}>
                    {t('admin.content.collapseAll')}
                  </button>
                </span>
              </>
            }
            active={filtering}
            clearLabel={t('admin.common.clear')}
            onClear={() => setFilters({ q: '', attention: false })}
            meta={filtering ? t('admin.content.shown', { count: rowCount }) : undefined}
          />

          {filtering && rowCount === 0 ? (
            <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-muted">{t('admin.content.noMatch')}</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
              <ul aria-label={t('admin.content.tree')} className="-mt-px">
                {tree.map(({ module, lessons }) => {
                  const open = isOpen(module.id)
                  const listId = `module-${module.id}-lessons`
                  return (
                    <li key={module.id}>
                      <div className={`${rowClass} ps-1`}>
                        <Chevron open={open} controls={listId} title={module.title} onToggle={() => toggle(module.id)} />
                        <Link to={`/admin/modules/${module.id}`} title={module.title} className={`${rowLink} min-w-0 py-2 font-semibold sm:truncate`}>
                          {module.title}
                        </Link>
                        <span className="hidden min-w-0 truncate font-mono text-xs text-muted sm:block" title={`${module.track} · ${module.slug}`}>
                          {module.track} · {module.slug}
                        </span>
                        {moduleWarnings(module).map((flag) => (
                          <Warning key={flag}>{t(`admin.content.${flag}`)}</Warning>
                        ))}
                        <span className="ms-auto flex shrink-0 items-center gap-1">
                          <span className="hidden pe-2 text-xs text-muted tabular-nums sm:inline">{t('admin.content.lessonCount', { count: module.lessons.length })}</span>
                          <RowAction to={`/admin/modules/${module.id}`} label={t('admin.content.editModule', { title: module.title })} icon={<Pencil aria-hidden="true" className="size-4" />} />
                          <RowAction to={`/admin/lessons/new?module=${module.id}`} label={t('admin.content.addLessonTo', { title: module.title })} icon={<Plus aria-hidden="true" className="size-4" />} />
                        </span>
                      </div>
                      <ul id={listId} hidden={!open}>
                        {module.lessons.length === 0 && (
                          <li className={`${rowClass} ps-14 text-sm text-muted sm:pointer-fine:ps-12`}>{t('admin.content.noLessons')}</li>
                        )}
                        {lessons.map(({ lesson, lessonProblems, shownProblems }) => (
                          <LessonRow key={lesson.id} lesson={lesson} problems={lessonProblems} shown={shownProblems} open={isOpen(lesson.id)} onToggle={() => toggle(lesson.id)} />
                        ))}
                      </ul>
                    </li>
                  )
                })}

                {(!filtering || shownStandalone.length > 0) && (
                  <li>
                    <div className={`${rowClass} ps-1`}>
                      <Chevron open={isOpen(STANDALONE)} controls="standalone-problems" title={t('admin.content.standalone')} onToggle={() => toggle(STANDALONE)} />
                      <span className="min-w-0 truncate font-semibold">{t('admin.content.standalone')}</span>
                      <span className="hidden min-w-0 truncate text-xs text-muted lg:block">{t('admin.content.standaloneIntro')}</span>
                      <span className="ms-auto flex shrink-0 items-center gap-1">
                        <span className="hidden pe-2 text-xs text-muted tabular-nums sm:inline">{t('admin.content.problemCount', { count: standalone.length })}</span>
                        {/* In the place of the other rows' Edit, so the counts line up. */}
                        <span aria-hidden="true" className="size-11 shrink-0 sm:pointer-fine:size-8" />
                        <RowAction to="/admin/problems/new" label={t('admin.content.addStandalone')} icon={<Plus aria-hidden="true" className="size-4" />} />
                      </span>
                    </div>
                    <ul id="standalone-problems" hidden={!isOpen(STANDALONE)}>
                      {shownStandalone.map((problem) => (
                        <ProblemRow key={problem.id} problem={problem} />
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LessonRow({
  lesson,
  problems,
  shown,
  open,
  onToggle,
}: {
  lesson: LessonSummary
  problems: ProblemSummary[]
  shown: ProblemSummary[]
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const listId = `lesson-${lesson.id}-problems`
  return (
    <li>
      <div className={`${rowClass} ps-2 sm:ps-6`}>
        {problems.length > 0 ? <Chevron open={open} controls={listId} title={lesson.title} onToggle={onToggle} /> : spacer}
        <span className="w-6 shrink-0 font-mono text-xs text-muted tabular-nums">{lesson.sort_order}</span>
        <Link to={`/admin/lessons/${lesson.id}`} title={lesson.title} className={`${rowLink} min-w-0 py-2 sm:truncate`}>
          {lesson.title}
        </Link>
        <span className="hidden min-w-0 truncate font-mono text-xs text-muted md:block" title={lesson.slug}>
          {lesson.slug}
        </span>
        {lessonWarnings(problems).map((flag) => (
          <Warning key={flag}>{t(`admin.content.${flag}`)}</Warning>
        ))}
        {VISUALS.has(lesson.slug) && <Info>{t('admin.content.flagVisual')}</Info>}
        <span className="ms-auto flex shrink-0 items-center gap-1">
          <RowAction to={`/admin/lessons/${lesson.id}`} label={t('admin.content.editLesson', { title: lesson.title })} icon={<Pencil aria-hidden="true" className="size-4" />} />
          <RowAction to={`/admin/problems/new?lesson=${lesson.id}`} label={t('admin.content.addProblemTo', { title: lesson.title })} icon={<Plus aria-hidden="true" className="size-4" />} />
        </span>
      </div>
      {problems.length > 0 && (
        <ul id={listId} hidden={!open}>
          {shown.map((problem) => (
            <ProblemRow key={problem.id} problem={problem} />
          ))}
        </ul>
      )}
    </li>
  )
}
