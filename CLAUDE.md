# CLAUDE.md

## Project overview

AlgosProj teaches data structures and algorithms (English and Arabic): lessons, visualizations,
in-browser code (Python, Java, JavaScript, C++) run against test cases, points, AI tutor hints.
Three repos, three deployments. Flow: frontend -> backend -> sandbox.
- **algosproj-frontend** (this repo) talks only to the backend.
- **algosproj-backend**: Laravel API. The only service that calls the sandbox.
- **algosproj-sandbox**: FastAPI, runs user code in throwaway Docker containers. Never
  public; the backend calls it with a shared secret.
Points are only awarded after server-side grading. Never trust a score sent by the client.

## This repo

- React 19, TypeScript, Vite, Tailwind v4 (no `tailwind.config`), react-router-dom, Monaco,
  i18next + react-i18next, Noto Sans Arabic (fontsource). No other runtime deps.
- `src/api.ts` (fetch wrapper, one function per endpoint), `src/auth.tsx`, `src/pages/*`,
  `src/components/*`, `src/visuals/*`, `src/lessonText.ts` (lesson text parser; backend README).
- Visualizations: `src/visuals/index.ts` maps a lesson slug to a lazy component. Steps are
  pure "frames" functions; `usePlayback` + `PlaybackControls` are shared. No chart library.
- `VITE_API_URL` in `.env` (default `http://localhost:8000`); a build arg in the Dockerfile.
  `VITE_SITE_URL` (public address, build time) is needed for canonical links, `og:url` and
  `sitemap.xml`; the Dockerfile has no arg for it.
- Public pages (README "Public pages"): `/` is `LandingPage` (tabs via `?tab=`), the old lessons list
  is `LessonsPage` at `/lessons`; also `/about`, `/faq`, `/contact`, `/terms`, `/privacy`, `/cookies`.
  `src/site.ts` holds `PRODUCT_NAME`, `CONTACT_EMAIL` (a placeholder), `SITE_URL`, `LEGAL_UPDATED`;
  strings use `{{product}}` and `{{email}}`. Each public page renders `PageMeta`.
- `npm run build` also prerenders the public pages (`src/prerender.ts` `ROUTES`, `scripts/prerender.mjs`,
  writes `dist-ssr/`, `dist/*.html`, `robots.txt`, `sitemap.xml`). No hydration. A new public page
  needs its path in `ROUTES`.
- Only `theme`, `lang`, `sound` in `localStorage` (try/catch); login is an HttpOnly session cookie
  (`credentials: 'include'`, `X-XSRF-TOKEN`). No `dangerouslySetInnerHTML`.
- Sound (README "Sound"): `src/sound.ts`, off by default, one AudioContext made only in a user gesture, tune the constants block at the top; never the only signal.
- Themes (README "Themes"): toggle, `src/theme.ts` + inline script in `index.html`. Tokens in
  `src/index.css`, other colors need `dark:`. Text 4.5:1, borders/shapes 3:1, both themes.
- Restyle (docs/ui-restyle.md outside the repo): radius 4/8 px, shadow only on floating things
  (--float-shadow), motion only behind motion-safe:, Icons.tsx and EmptyState.tsx shared.
- English/Arabic (README "Languages"): no literal UI text; `t()` with keys in `en.json`/`ar.json`,
  visuals in lazy `visuals.en.json`/`.ar.json`, `admin.*` in `en.json` only. Whole sentences, six
  Arabic plural forms. Frame functions take `t` last. Arabic marks terms `~term~`, values
  `` `code` `` (`TextWithCode`: code plus touching text in one `inline-block`). Course text via
  `Content` (`*_lang`, titles `lang="auto"`). Code, drawings, data inputs, emails, `/admin/*`
  stay LTR. Logical Tailwind; Western digits; `formatDateTime`/`formatNumber`/`formatPercent`/`formatDate`. `<title>`: `titles.page`; skip link.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm run lint` (oxlint + `check:i18n`).

## Working rules

- Keep code simple. Don't add abstractions, patterns or dependencies I didn't ask for.
- Don't do extra work beyond the request. If you spot something worth fixing, mention it
  instead of changing it.
- Ask before adding a new dependency.
- Never add Co-Authored-By or Claude-Session lines, or any other attribution, to commit
  messages or PR descriptions. ep2wq is the only author.

## Session routine

- At the start of a session, read this file and "Current status" before anything else.
- Before ending a session, or when I say we're done, rewrite "Current status" to match
  reality (don't append). Remove finished or untrue items; keep the file concise.
- Only record facts you verified in the repo or that I told you. Don't guess.
- Update the other sections of this file too if something in them became wrong.
- Don't commit the CLAUDE.md update unless I ask. Tell me it changed.

## Current status

- Done: lessons, Monaco + submit, auth, leaderboard, landing page, About/FAQ/Contact/legal pages,
  binary search 404, prerender, Challenges, admin, dark mode, Arabic
  interface + content (all 19 modules), visualizations translated. Next: AI hint UI.
- Decisions: oxlint. Lint/build pass. A 401 while `signedIn` (not login/register/logout), or a
  403 with `reason`, clears it; a 419 refreshes the CSRF cookie and retries once, a second 419 = ended; `/login` shows "session ended" or the ban. "(you)" is `is_you`.
  `user.role` only hides links and pages; the backend enforces it. Code blocks tabIndex 0.
  `SiteMenu` (`Layout.tsx`, replaced `AccountMenu`): a "More" disclosure at every width (About, FAQ,
  Contact; below `lg` also name and Log out; below `sm` also Admin or Log in), not role="menu". Footer
  on every page. Legal texts are drafts needing review; `CONTACT_EMAIL` is still a placeholder.
- Gotchas: Monaco loads from jsDelivr at runtime. Vite must run on port 5173 (CORS and the backend's `SANCTUM_STATEFUL_DOMAINS`); `VITE_API_URL` uses the same host name as the page. One-line
  lint disables: `react/only-export-components` (auth.tsx), `react/static-components`.
