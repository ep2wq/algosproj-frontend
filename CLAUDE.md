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
- Only the token, `theme`, `lang` in `localStorage` (try/catch). No `dangerouslySetInnerHTML`.
- Themes (README "Themes"): toggle, `src/theme.ts` + inline script in `index.html`. Tokens in
  `src/index.css`, other colors need `dark:`. Text 4.5:1, borders/shapes 3:1, both themes.
- English/Arabic (README "Languages"): every user-visible string through `t()`, in `en.json`
  and `ar.json` (six Arabic plural forms). Logical Tailwind classes only. Course text comes in
  the app language (`Accept-Language`) via `Content`: `body_lang`/`description_lang`, titles
  `lang="auto"`, `` `inline code` `` LTR (`TextWithCode`). Content pages refetch on a language
  switch without remounting the editor. Code, visuals, emails, `/admin/*` (with `*_ar` fields)
  stay English LTR. Western digits; dates via `formatDateTime`. No letter-spacing on Arabic.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.

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
  reality (don't append). Remove finished or untrue items; keep the file under 60 lines.
- Only record facts you verified in the repo or that I told you. Don't guess.
- Update the other sections of this file too if something in them became wrong.
- Don't commit the CLAUDE.md update unless I ask. Tell me it changed.

## Current status

- Done: lessons, Monaco + submit, auth, leaderboard, 404, Challenges, admin, dark mode, Arabic
  interface + content (phase 2, first module translated). Next: more modules, AI hint UI.
- Decisions: oxlint. Lint/build pass. A 401 with a token (not login/register/logout), or a
  403 with `reason`, clears it; `/login` shows "session ended" or the ban. "(you)" is `is_you`.
  `user.role` only hides links and pages; the backend enforces it. Code blocks tabIndex 0.
- Gotchas: Monaco loads from jsDelivr at runtime. Vite must run on port 5173 (CORS). One-line
  lint disables: `react/only-export-components` (auth.tsx), `react/static-components`.
