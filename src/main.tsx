import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'

// After a deploy, a tab opened before it asks for hashed files that no longer exist and a lazy page
// fails to load. Reload once to get the new build. At most one reload per 10 seconds (the time is kept
// in sessionStorage), so a deploy that is really broken cannot reload forever; without storage, no reload.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem('chunk-reload')) < 10_000) return
    sessionStorage.setItem('chunk-reload', String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

// A prerendered page (scripts/prerender.mjs) brings its own head tags; the app renders its own
// and replaces the static markup in #root.
document.querySelectorAll('[data-prerender]').forEach((element) => element.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// The web fonts, after the app (src/fonts.css says why).
void import('./fonts.css')
