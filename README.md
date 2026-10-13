# algosproj-frontend

The web client for AlgosProj, a platform for learning data structures and algorithms.
Students read lessons, watch visualizations, and write code in the browser. This repo
only talks to the Laravel backend (`algosproj-backend`), which handles auth, lessons and
grading. It never calls the sandbox service directly.

## Stack

React 19, TypeScript, Vite, Tailwind v4 (via `@tailwindcss/vite`, so there is no
`tailwind.config` file).

## Setup

```bash
npm install
npm run dev
```

Other commands:

- `npm run build` — production build
- `npm run lint` — lint

## Environment variables

Put these in `.env.local`:

- `VITE_API_URL` — base URL of the backend API, e.g. `http://localhost:8000`
