# CLAUDE.md

## Project overview

AlgosProj is an interactive learning platform for data structures and algorithms.
Students read a lesson, watch a visualization, write code in the browser (Python or
Java), and the code is run against test cases. Passing earns points on a leaderboard.
An AI tutor gives hints.

Three separate repos, three separate deployments:

- **algosproj-frontend**: React + TypeScript + Vite + Tailwind v4. Talks only to the backend.
- **algosproj-backend**: Laravel API. Handles auth (Sanctum tokens), lessons, problems,
  submissions, points and the leaderboard. It is the only service that calls the sandbox.
- **algosproj-sandbox**: FastAPI service that runs user code in throwaway Docker containers
  and returns the results. Never exposed to the public internet; the backend calls it with
  a shared secret.

Flow: frontend -> backend -> sandbox. The frontend never calls the sandbox directly.

Points and completions are only awarded after the sandbox grades a submission
server-side. Never trust a score sent by the client.

## This repo

- Stack: React 19, TypeScript, Vite, Tailwind v4 (via `@tailwindcss/vite`, no
  `tailwind.config` file), react-router-dom, @monaco-editor/react. No other runtime
  dependencies: `fetch` for HTTP, React context for auth.
- Structure: `src/api.ts` (fetch wrapper, error handling, one typed function per
  endpoint), `src/auth.tsx` (AuthProvider, `useAuth`), `src/pages/*`, `src/components/*`,
  `src/visuals/*` (lesson visualizations).
- Visualizations: `src/visuals/index.ts` maps a lesson slug to a lazy component. Steps are
  pure "frames" functions; the player is plain React + Tailwind, no charting library.
- API base URL comes from `VITE_API_URL` in `.env` (default `http://localhost:8000`).
- Only the token goes in `localStorage`. Render server text as plain text; never use
  `dangerouslySetInnerHTML`.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.
- Dockerfile: builds with Node, serves `dist` with nginx on port 80; `VITE_API_URL` is a build arg (see README).

## Working rules

- Keep code simple. Don't add abstractions, patterns or dependencies I didn't ask for.
- Don't do extra work beyond the request. If you spot something worth fixing, mention it
  instead of changing it.
- Ask before adding a new dependency.
- Never add Co-Authored-By or Claude-Session lines, or any other attribution, to commit
  messages or PR descriptions. ep2wq is the only author.

## Session routine

- At the start of a session, read this file and the "Current status" section before
  doing anything else.
- Before ending a session, or when I say we're done, update "Current status" to match
  reality. Rewrite the section; don't append to it. Remove items that are finished or no
  longer true, so the file stays short (under about 60 lines in total).
- Only record facts you verified in the repo or that I told you. Don't guess.
- Update the other sections of this file too if something in them became wrong.
- Don't commit the CLAUDE.md update unless I ask. Tell me it changed.

## Current status

### Done
- First working version: header with auth state and points, lessons list (grouped by
  track), lesson page (lazy-loaded) with Monaco editor, per-language starter code and
  submit results, login/register, leaderboard with the user's row or rank, "Page not
  found". Lint and build pass; checked end to end against the real backend and sandbox.
- Sorting visualization on `sort-an-array` (bubble, insertion, merge; play/step/speed,
  random or typed array). Frames checked with a script over 200 arrays; played in the
  browser, incl. phone width.
- All committed, not pushed.

### In progress
- Nothing.

### Next
- Visualizations for other lessons (add to `src/visuals/index.ts`) and the AI hint UI
  once the backend has a hint endpoint.

### Decisions
- Linting uses oxlint (`npm run lint`), not ESLint.
- A 401 on a request that sent a token clears the token and goes to `/login`; a 401
  without a token (wrong password) is shown as an error.
- The leaderboard API has no user ids, so the user's row is matched on name, rank and
  points from `/leaderboard/me`.
- Sort frames: bubble/insertion use adjacent swaps; merge sort shows its comparisons, then
  writes each merged range back in one frame, so every frame is a permutation of the input.
  Only bubble sort marks bars "in final place" before the last frame.

### Gotchas
- Monaco is loaded from the jsDelivr CDN at runtime (the `@monaco-editor/react`
  default); `monaco-editor` is only an auto-installed peer dependency.
- `auth.tsx` exports the provider and `useAuth` together, so one
  `react/only-export-components` lint rule is disabled on that line.
- Vite must run on port 5173, the backend's allowed CORS origin.
- `<Visual />` on the lesson page has one `react/static-components` lint rule disabled:
  it comes from a module-level map, not created during render.
