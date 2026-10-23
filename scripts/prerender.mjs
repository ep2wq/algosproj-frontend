// Writes static HTML for the public pages after `vite build` and `vite build --ssr src/prerender.ts`
// (npm run build; README "Public pages"). For each route it renders the app to a string, moves the
// <title>, <meta> and <link> tags React puts first into <head> (marked data-prerender, which
// src/main.tsx removes before the app renders), and fills <div id="root">. Writes dist/index.html
// (the landing page, also the fallback for every other address), dist/<page>.html, robots.txt and
// sitemap.xml. The browser does not hydrate this HTML: the app renders afresh and replaces it.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// The published HTML comes from React's production server build (react-dom is not bundled, so Node
// picks the build from NODE_ENV when it is first imported below).
process.env.NODE_ENV = 'production'

// Fails the build when a page has a server-render error (React's client-render marker and its
// message) or a path of the build machine.
const project = fileURLToPath(new URL('..', import.meta.url))
function check(name, text) {
  const found =
    text.match(/<!--\$!-->|data-(?:msg|stck|cstck|dgst)=|file:\/\/|[A-Za-z]:[\\/]Users\b|node_modules/)?.[0] ??
    [project, project.replaceAll('\\', '/')].find((path) => text.includes(path))
  if (found) throw new Error(`prerender: ${name} contains "${found}" (a server-render error or a build path)`)
}

// The client build folder: dist, or the folder given as the first argument (a build elsewhere).
const dist = process.argv[2] ? pathToFileURL(`${resolve(process.argv[2])}/`) : new URL('../dist/', import.meta.url)
const { render, ROUTES, SITE_URL } = await import(new URL('../dist-ssr/prerender.js', import.meta.url))
const template = readFileSync(new URL('index.html', dist), 'utf8')
const ROOT = '<div id="root"></div>'
if (!template.includes(ROOT)) throw new Error(`dist/index.html has no ${ROOT}`)

for (const route of ROUTES) {
  const html = render(route)
  const head = html.match(/^(?:<(?:title|meta|link)\b[^>]*>(?:[^<]*<\/title>)?)*/)[0]
  if (!head.includes('<title')) throw new Error(`${route}: no <title> at the start of the rendered page`)
  const page = template
    .replace(/<title>[^<]*<\/title>/, '')
    .replace('</head>', `${head.replace(/<(title|meta|link)\b/g, '<$1 data-prerender')}</head>`)
    .replace(ROOT, `<div id="root" data-prerendered="${route}">${html.slice(head.length)}</div>`)
  check(route, page)
  writeFileSync(new URL(route === '/' ? 'index.html' : `${route.slice(1)}.html`, dist), page)
}

// Only the public pages are listed. Without VITE_SITE_URL there is no absolute address, so no
// sitemap (and no canonical links in the pages).
const robots = ['User-agent: *', 'Disallow: /admin']
if (SITE_URL) {
  robots.push(`Sitemap: ${SITE_URL}/sitemap.xml`)
  const urls = ROUTES.map((route) => `  <url><loc>${SITE_URL}${route === '/' ? '/' : route}</loc></url>`).join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  check('sitemap.xml', sitemap)
  writeFileSync(new URL('sitemap.xml', dist), sitemap)
} else {
  console.warn('prerender: VITE_SITE_URL is not set, so sitemap.xml and canonical links are left out.')
}
check('robots.txt', robots.join('\n'))
writeFileSync(new URL('robots.txt', dist), `${robots.join('\n')}\n`)
console.log(`prerender: wrote ${ROUTES.length} pages`)
