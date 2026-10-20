import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, getModules, type Module } from '../api'
import Content from '../components/Content'

// "data-structures" -> "Data structures"
function trackName(track: string): string {
  const words = track.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const [modules, setModules] = useState<Module[] | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [reload, setReload] = useState(0)

  // Titles come in the app language, so load again when it changes (the old list stays until then).
  const language = i18n.language
  useEffect(() => {
    let active = true
    getModules()
      .then((list) => {
        if (active) setModules(list)
      })
      .catch((err) => {
        if (active) setFailure(err)
      })
    return () => {
      active = false
    }
  }, [language, reload])

  const error = failure === null ? '' : failure instanceof ApiError ? failure.message : t('home.loadFailed')

  function retry() {
    // The button goes away; keep keyboard focus in the page.
    document.getElementById('main')?.focus()
    setFailure(null)
    setReload((count) => count + 1)
  }

  // Modules arrive in sort_order; group them by track, keeping that order.
  const tracks = new Map<string, Module[]>()
  for (const module of modules ?? []) {
    tracks.set(module.track, [...(tracks.get(module.track) ?? []), module])
  }

  return (
    <div className="max-w-3xl">
      <title>{t('titles.page', { name: t('home.title') })}</title>
      <h1 className="text-3xl font-semibold tracking-tight">{t('home.title')}</h1>
      <p className="mt-2 text-muted">{t('home.intro')}</p>

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-fail/30 bg-fail/5 px-3 py-2 text-fail">
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded border border-current px-3 py-1 text-sm font-medium hover:bg-fail/10"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      )}
      {!error && modules === null && <p className="mt-6 text-muted">{t('home.loading')}</p>}
      {modules !== null && modules.length === 0 && <p className="mt-6 text-muted">{t('home.empty')}</p>}

      {[...tracks].map(([track, trackModules]) => (
        <section key={track} className="mt-10" aria-labelledby={`track-${track}`}>
          <h2 id={`track-${track}`} className="border-b border-line pb-2 text-xl font-semibold">
            {t(`home.tracks.${track}`, { defaultValue: trackName(track) })}
          </h2>
          {trackModules.map((module) => (
            <div key={module.id} className="mt-5">
              <h3 className="font-medium text-ink">
                <Content lang="auto">{module.title}</Content>
              </h3>
              {module.lessons.length === 0 ? (
                <p className="mt-1 text-sm text-muted">{t('home.moduleEmpty')}</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        to={`/lessons/${lesson.slug}`}
                        className="block rounded px-4 py-3 text-accent hover:bg-accent-soft"
                      >
                        <Content lang="auto">{lesson.title}</Content>
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
