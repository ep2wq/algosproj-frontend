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
  `tailwind.config` file).
- Planned: Monaco editor for code, React Flow or D3 for visualizations.
- API base URL comes from `VITE_API_URL`.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.

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
- Vite + React 19 + TypeScript scaffold with Tailwind v4; `src/App.tsx` is only a
  placeholder heading. Committed and pushed.

### In progress
- Nothing.

### Next
- Pages for register/login and lessons, once the backend has those endpoints.
- Code editor (Monaco is planned; ask before adding it).

### Decisions
- Linting uses oxlint (`npm run lint`), not ESLint.

### Gotchas
- There is no `.env.local` yet; create it with `VITE_API_URL` before calling the API.
