import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'

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
