import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, getLesson, type Lesson } from '../api'
import ProblemCard from '../components/ProblemCard'

// Loaded with React.lazy, so Monaco stays out of the first bundle.
export default function LessonPage() {
  const { slug = '' } = useParams()
  // The loaded result is stored with its slug, so a stale lesson never shows for a new URL.
  const [loaded, setLoaded] = useState<{ slug: string; lesson?: Lesson; error?: string } | null>(null)

  useEffect(() => {
    let active = true
    getLesson(slug)
      .then((lesson) => {
        if (active) setLoaded({ slug, lesson })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) {
          setLoaded({ slug, error: "This lesson doesn't exist." })
        } else {
          setLoaded({ slug, error: err instanceof ApiError ? err.message : 'Could not load the lesson.' })
        }
      })
    return () => {
      active = false
    }
  }, [slug])

  const current = loaded?.slug === slug ? loaded : null
  const lesson = current?.lesson ?? null
  const error = current?.error ?? ''

  if (error) {
    return (
      <div className="max-w-prose">
        <p role="alert" className="rounded border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          {error}
        </p>
        <Link to="/" className="mt-4 inline-block rounded text-accent underline underline-offset-2">
          Back to the lessons
        </Link>
      </div>
    )
  }

  if (!lesson) return <p className="text-muted">Loading lesson...</p>

  return (
    <div>
      <Link to="/" className="rounded text-sm text-muted hover:text-accent">
        All lessons
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{lesson.title}</h1>
      {lesson.body && <p className="mt-4 max-w-prose whitespace-pre-wrap leading-relaxed">{lesson.body}</p>}

      {lesson.problems.map((problem) => (
        <ProblemCard key={problem.id} problem={problem} />
      ))}
    </div>
  )
}
