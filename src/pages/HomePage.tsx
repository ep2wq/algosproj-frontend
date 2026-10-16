import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getModules, type Module } from '../api'

// "data-structures" -> "Data structures"
function trackName(track: string): string {
  const words = track.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export default function HomePage() {
  const [modules, setModules] = useState<Module[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getModules()
      .then(setModules)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load the lessons.'))
  }, [])

  // Modules arrive in sort_order; group them by track, keeping that order.
  const tracks = new Map<string, Module[]>()
  for (const module of modules ?? []) {
    tracks.set(module.track, [...(tracks.get(module.track) ?? []), module])
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Lessons</h1>
      <p className="mt-2 text-muted">Pick a lesson, read it, then solve its problems in the editor.</p>

      {error && (
        <p role="alert" className="mt-6 rounded border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          {error}
        </p>
      )}
      {!error && modules === null && <p className="mt-6 text-muted">Loading lessons...</p>}
      {modules !== null && modules.length === 0 && <p className="mt-6 text-muted">No lessons have been published yet.</p>}

      {[...tracks].map(([track, trackModules]) => (
        <section key={track} className="mt-10" aria-labelledby={`track-${track}`}>
          <h2 id={`track-${track}`} className="border-b border-line pb-2 text-xl font-semibold">
            {trackName(track)}
          </h2>
          {trackModules.map((module) => (
            <div key={module.id} className="mt-5">
              <h3 className="font-medium text-ink">{module.title}</h3>
              {module.lessons.length === 0 ? (
                <p className="mt-1 text-sm text-muted">No lessons in this module yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded border border-line bg-surface">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to={`/lessons/${lesson.slug}`}
                        className="block rounded px-4 py-3 text-accent hover:bg-accent-soft"
                      >
                        {lesson.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
