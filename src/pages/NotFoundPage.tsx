import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="max-w-prose">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">
        There is nothing at this address.{' '}
        <Link to="/" className="rounded text-accent underline underline-offset-2">
          Go to the lessons
        </Link>
        .
      </p>
    </div>
  )
}
