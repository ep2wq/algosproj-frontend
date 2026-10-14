# algosproj-frontend

The web client for AlgosProj, a platform for learning data structures and algorithms.
Students read lessons, watch visualizations, and write code in the browser. This repo
only talks to the Laravel backend (`algosproj-backend`), which handles auth, lessons and
grading. It never calls the sandbox service directly.

## Stack

React 19, TypeScript, Vite, Tailwind v4 (via `@tailwindcss/vite`, so there is no
`tailwind.config` file), React Router, and Monaco (`@monaco-editor/react`) for the code
editor. API calls use `fetch`; auth state lives in a React context.

## Setup

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

The app needs the other services running. From the `AlgosProj` folder:

1. MySQL: `docker start algosproj-mysql` (host port 3307).
2. Backend: in `algosproj-backend`, `php artisan migrate --seed` once, then
   `php artisan serve --port=8000`.
3. Sandbox: in `algosproj-sandbox`, build the runner image once
   (`docker build -t algosproj-runner runner`), then
   `venv\Scripts\python -m uvicorn app.main:app --port 8001`.
4. Frontend: `npm run dev` in this repo.

The backend only allows CORS requests from its `FRONTEND_URL` (default
`http://localhost:5173`), so keep the dev server on that port.

The editor loads Monaco from the jsDelivr CDN at runtime (the `@monaco-editor/react`
default), so the lesson page needs internet access.

Other commands:

- `npm run build` — production build
- `npm run lint` — lint

## Environment variables

Put these in `.env` (copy `.env.example`; `.env` is not committed):

- `VITE_API_URL` — base URL of the backend, default `http://localhost:8000`. The app
  calls `${VITE_API_URL}/api/...`.

Only the auth token is stored in `localStorage`.

## Pages

- `/` lessons grouped by track, `/lessons/:slug` lesson with editor and submit,
  `/login`, `/register`, `/leaderboard`. Unknown paths show "Page not found".

## Docker

```bash
docker build --build-arg VITE_API_URL=http://localhost:8000 -t algosproj-frontend .
docker run -p 8080:80 algosproj-frontend
```

The app is then served by nginx at http://localhost:8080. Unknown paths fall back to
`index.html`, and files in `/assets` are cached for a year.

- `VITE_API_URL` (build arg) — base URL of the backend API. Vite bakes it into the
  bundle at build time, so changing it means rebuilding the image; setting it with
  `docker run -e` has no effect. `.env` files are not copied into the image.
