# CLAUDE.md

## Project overview

AlgosLab teaches data structures and algorithms (English and Arabic): lessons, visualizations,
in-browser code (Python, Java, JavaScript, C++) run against test cases, points, AI tutor hints.
Three repos, three deployments. Flow: frontend -> backend -> sandbox.
- **algosproj-frontend** (this repo) talks only to the backend.
- **algosproj-backend**: Laravel API. The only service that calls the sandbox.
- **algosproj-sandbox**: FastAPI, runs user code in throwaway Docker containers. Never
  public; the backend calls it with a shared secret.
Points are only awarded after server-side grading. Never trust a score sent by the client.

## This repo

- React 19, TypeScript, Vite, Tailwind v4 (no `tailwind.config`), react-router-dom, Monaco,
  i18next + react-i18next, Noto Sans Arabic (fontsource). Base UI (`@base-ui/react`), class-variance-authority, clsx, tailwind-merge and lucide-react for shadcn/ui. No other runtime deps.
- shadcn/ui (Base UI) is the standard for new UI: `src/components/ui/*`, `cn` in `src/lib/utils.ts`,
  `components.json` (hand-written, rtl true), `@/` alias in `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`.
  Add with `npx shadcn@latest add <name>`, then map to our tokens (docs/ui-shadcn.md outside the repo).
  `DirectionProvider` in `Layout` gives Base UI the reading direction.
- `src/api.ts` (fetch wrapper, one function per endpoint), `src/auth.tsx`, `src/pages/*`,
  `src/components/*`, `src/visuals/*`, `src/lessonText.ts` (lesson text parser; backend README).
- Ids from the API are UUID strings (`string` in `api.ts`): never `Number()`/`parseInt` an id or sort by it.
- Visualizations: `src/visuals/index.ts` maps a lesson slug to a lazy component. Steps are
  pure "frames" functions; `usePlayback` + `PlaybackControls` are shared. No chart library.
- `VITE_API_URL` in `.env` (default `http://localhost:8000`); a build arg in the Dockerfile.
  `VITE_SITE_URL` (public address, build time) is needed for canonical links, `og:url` and
  `sitemap.xml`; the Dockerfile has no arg for it.
- Public pages (README "Public pages"): `/` is `LandingPage` (tabs via `?tab=`), the old lessons list
  is `LessonsPage` at `/lessons`; also `/about`, `/faq`, `/contact`, `/terms`, `/privacy`, `/cookies`.
  `src/site.ts` holds `PRODUCT_NAME` (AlgosLab), `CONTACT_EMAIL` (contact@algoslab.sa), `SITE_URL`, `LEGAL_UPDATED`;
  strings use `{{product}}` and `{{email}}`. Each public page renders `PageMeta`.
- `npm run build` also prerenders the public pages (`src/prerender.ts` `ROUTES`, `scripts/prerender.mjs`,
  writes `dist-ssr/`, `dist/*.html`, `robots.txt`, `sitemap.xml`). No hydration. A new public page
  needs its path in `ROUTES`. The build fails on a React client-render marker or build path in the output.
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
- Loading (README "Loading states"): `LoadingRegion`/`SkeletonLines`/`CellLoader` in `src/components/Loading.tsx`
  (200 ms delay, one status line, nothing loops); `ScrollProgress` on lesson and text pages; `Layout` passes
  a skip-link slot via `Outlet context`, `LessonPage` portals "Skip to challenge" into it.
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
  interface + content (all 19 modules), visualizations translated, shadcn/ui setup + landing tabs on Base UI,
  loading skeletons, cell loader, scroll progress, skip to challenge. Next: AI hint UI.
- Landing redesign (plan and reports in `docs/landing-sections-audit.md`, outside the repo): step 1
  (slate/emerald colour tokens) is committed and pushed; step 2 (footer: brand + mission, Learn,
  About the site with the contact email, Legal; 4 columns from lg, 2 x 2 from sm, 1 below) is done.
- Decisions: oxlint. Lint/build pass. A 401 while `signedIn` (not login/register/logout), or a
  403 with `reason`, clears it; a 419 refreshes the CSRF cookie and retries once, a second 419 = ended; `/login` shows "session ended" or the ban. "(you)" is `is_you`.
  `user.role` only hides links and pages; the backend enforces it. Code blocks tabIndex 0.
  `SiteMenu` (`Layout.tsx`, replaced `AccountMenu`): a "More" disclosure at every width (About, FAQ,
  Contact; below `lg` also name and Log out; below `sm` also Admin or Log in), not role="menu". Footer
  on every page. Legal texts are drafts needing review; the `CONTACT_EMAIL` mailbox must exist before launch.
- Gotchas: Monaco loads from jsDelivr at runtime. Vite must run on port 5173 (CORS and the backend's `SANCTUM_STATEFUL_DOMAINS`); `VITE_API_URL` uses the same host name as the page. One-line
  lint disables: `react/only-export-components` (auth.tsx), `react/static-components`.
  The global `:focus-visible` rule at the end of `src/index.css` is outside any `@layer`, so it beats
  utilities like `focus:outline-none`; use the `!` suffix to override.
