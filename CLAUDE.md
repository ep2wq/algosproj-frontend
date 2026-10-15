# CLAUDE.md

## Project overview

AlgosProj teaches data structures and algorithms: lessons, visualizations, in-browser code
(Python, Java, JavaScript, C++) run against test cases, points on a leaderboard, AI tutor hints.
Three repos, three deployments. Flow: frontend -> backend -> sandbox.
- **algosproj-frontend** (this repo) talks only to the backend.
- **algosproj-backend**: Laravel API (Sanctum auth, lessons, problems, submissions, points,
  leaderboard). The only service that calls the sandbox.
- **algosproj-sandbox**: FastAPI, runs user code in throwaway Docker containers. Never
  public; the backend calls it with a shared secret.
Points are only awarded after server-side grading. Never trust a score sent by the client.

## This repo

- React 19, TypeScript, Vite, Tailwind v4 (`@tailwindcss/vite`, no `tailwind.config`),
  react-router-dom, @monaco-editor/react. No other runtime deps; `fetch`, React context.
- `src/api.ts` (fetch wrapper, one typed function per endpoint), `src/auth.tsx`,
  `src/pages/*`, `src/components/*`, `src/visuals/*`, `src/lessonText.ts` (lesson text
  parser: `## ` headings, `- ` lists, 4-space code, paragraphs; format in backend README).
- Visualizations: `src/visuals/index.ts` maps a lesson slug to a lazy component. Steps are
  pure "frames" functions; `usePlayback` + `PlaybackControls` are shared. No chart library.
- `VITE_API_URL` in `.env` (default `http://localhost:8000`); a build arg in the Dockerfile.
- Only the token goes in `localStorage`. Render server text as plain text; never use
  `dangerouslySetInnerHTML`.
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

- Done: lessons list, lesson page with Monaco and submit, login/register, leaderboard,
  404, lesson text rendering (`LessonBody`). Visualizations on 12 of 12 lessons. Lint and
  build pass. Recent work is unpushed.
- Next: AI hint UI once the backend has one.
- Decisions: oxlint, not ESLint. A 401 with a token clears it and goes to `/login`.
  Leaderboard "me" row is matched on name, rank and points (no user ids).
  Visualization frame design: see README "Visualizations". Code blocks have tabIndex 0
  so keyboard users can scroll them.
- Gotchas: Monaco loads from the jsDelivr CDN at runtime. Lint rules disabled on one line
  each: `react/only-export-components` (auth.tsx), `react/static-components`
  (`<Visual />`, which comes from a module-level map). Vite must run on port 5173 (CORS).
