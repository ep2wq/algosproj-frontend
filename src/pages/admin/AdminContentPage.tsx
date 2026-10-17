import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getAdminModules, getAdminProblems, type AdminProblem, type Module } from '../../api'
import DifficultyBadge from '../../components/DifficultyBadge'
import { alertClass, buttonLink } from './styles'

type ProblemSummary = Omit<AdminProblem, 'title_ar' | 'description' | 'description_ar'>

function ProblemRow({ problem }: { problem: ProblemSummary }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="min-w-0 break-words">{problem.title}</span>
      <DifficultyBadge difficulty={problem.difficulty} />
      <span className="text-sm text-muted tabular-nums">{problem.points} points</span>
      <Link to={`/admin/problems/${problem.id}`} className={`${buttonLink} ms-auto`}>
        Edit<span className="sr-only"> problem {problem.title}</span>
      </Link>
    </li>
  )
}

// Every module with its lessons and their problems, then the standalone problems.
export default function AdminContentPage() {
  const [modules, setModules] = useState<Module[] | null>(null)
  const [problems, setProblems] = useState<ProblemSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAdminModules(), getAdminProblems()])
      .then(([moduleList, problemList]) => {
        setModules(moduleList)
        setProblems(problemList)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the content.'))
  }, [])

  const standalone = problems.filter((problem) => problem.lesson_id === null)

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Admin: content</h1>
      <p className="mt-2 text-muted">Changes are saved to the database and show on the site at once.</p>

      {error && (
        <p role="alert" className={`mt-6 ${alertClass}`}>
          {error}
        </p>
      )}
      {!error && modules === null && <p className="mt-6 text-muted">Loading content...</p>}

      {modules !== null && (
        <>
          <div className="mt-6">
            <Link to="/admin/modules/new" className={buttonLink}>
              Add module
            </Link>
          </div>

          {modules.map((module) => (
            <section key={module.id} className="mt-8 rounded border border-line bg-surface p-4" aria-labelledby={`module-${module.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={`module-${module.id}`} className="min-w-0 break-words text-xl font-semibold">
                  {module.title}
                </h2>
                <span className="text-sm text-muted">
                  {module.slug} · order {module.sort_order}
                </span>
                <div className="ms-auto flex flex-wrap gap-2">
                  <Link to={`/admin/modules/${module.id}`} className={buttonLink}>
                    Edit<span className="sr-only"> module {module.title}</span>
                  </Link>
                  <Link to={`/admin/lessons/new?module=${module.id}`} className={buttonLink}>
                    Add lesson<span className="sr-only"> to {module.title}</span>
                  </Link>
                </div>
              </div>

              {module.lessons.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No lessons yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {module.lessons.map((lesson) => {
                    const lessonProblems = problems.filter((problem) => problem.lesson_id === lesson.id)
                    return (
                      <li key={lesson.id} className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="min-w-0 break-words font-medium">{lesson.title}</h3>
                          <span className="text-sm text-muted">
                            {lesson.slug} · order {lesson.sort_order}
                          </span>
                          <div className="ms-auto flex flex-wrap gap-2">
                            <Link to={`/admin/lessons/${lesson.id}`} className={buttonLink}>
                              Edit<span className="sr-only"> lesson {lesson.title}</span>
                            </Link>
                            <Link to={`/admin/problems/new?lesson=${lesson.id}`} className={buttonLink}>
                              Add problem<span className="sr-only"> to {lesson.title}</span>
                            </Link>
                          </div>
                        </div>
                        {lessonProblems.length > 0 && (
                          <ul className="mt-1 ps-4">
                            {lessonProblems.map((problem) => (
                              <ProblemRow key={problem.id} problem={problem} />
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-8 rounded border border-line bg-surface p-4" aria-labelledby="standalone-heading">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="standalone-heading" className="text-xl font-semibold">
                Standalone problems
              </h2>
              <Link to="/admin/problems/new" className={`${buttonLink} ms-auto`}>
                Add standalone problem
              </Link>
            </div>
            <p className="mt-1 text-sm text-muted">Problems without a lesson. They appear on Challenges only.</p>
            {standalone.length > 0 && (
              <ul className="mt-2 divide-y divide-line border-t border-line">
                {standalone.map((problem) => (
                  <ProblemRow key={problem.id} problem={problem} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
