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
