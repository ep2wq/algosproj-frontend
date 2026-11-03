// Build-time entry for the static HTML of the public pages (scripts/prerender.mjs, README
// "Public pages"). Renders the app in English for one address, with nobody logged in and no data:
// the data parts (tabs, counts) load in the browser. Never used at runtime.
import { createElement, StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import './i18n'

export { SITE_URL } from './site'

// The API's origin, for the Content-Security-Policy's connect-src (public/_headers). Same fallback as src/api.ts.
export const API_ORIGIN = new URL(import.meta.env.VITE_API_URL || 'http://localhost:8000').origin

// The public pages: prerendered and listed in sitemap.xml. Everything else is the single-page app.
export const ROUTES = ['/', '/about', '/faq', '/contact', '/terms', '/privacy', '/cookies']

export function render(url: string): string {
  // The same tree as src/main.tsx, with a StaticRouter for the one address.
  return renderToString(
    createElement(StrictMode, null, createElement(StaticRouter, { location: url }, createElement(AuthProvider, null, createElement(App)))),
  )
}
