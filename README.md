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

Lesson text is parsed by `src/lessonText.ts` (a pure function: headings `## `, `- ` lists,
4-space-indented code blocks, paragraphs) and rendered by `src/components/LessonBody.tsx`
as plain React elements. The format is documented in the backend README.

## Visualizations

`src/visuals/index.ts` maps a lesson slug to a lazy-loaded component, shown between the
lesson text and the problems. 24 of the 31 lessons have one; the four Programming basics
lessons and the three Recursion and backtracking lessons have none yet:

- `warm-up`: read, compute, print for "Double the number": standard input, the program
  (Python, Java, JavaScript or C++, current line highlighted) and standard output
  (`WarmupVisual.tsx`, `warmupFrames.ts`).
- `sum-of-an-array`, `maximum-of-an-array`: one pass with a running total or running best
  (`ArrayScanVisual.tsx` with a `mode` prop, `arrayScanFrames.ts`).
- `reverse-a-string`, `check-for-a-palindrome`: two pointers moving inward
  (`TwoPointerVisual.tsx` with a `mode` prop, `twoPointerFrames.ts`).
- `balanced-brackets`, `evaluate-a-postfix-expression`, `next-greater-element`: the input
  in a row and a stack column with its top labelled (`StackVisual.tsx` with a `mode` prop,
  `stackFrames.ts`).
- `sort-an-array`: bubble, insertion and merge sort (`sortFrames.ts`).
- `binary-search`: low/mid/high over a sorted array with a target (`binarySearchFrames.ts`).
- `two-sum`: one walk with a value -> position hash map (`TwoSumVisual.tsx`, `twoSumFrames.ts`).
- `count-inversions`: merge sort with a running inversion count (`InversionsVisual.tsx`,
  `inversionFrames.ts`).
- `reverse-a-linked-list`, `middle-of-a-linked-list`, `detect-a-cycle`: nodes, next arrows
  and null, with prev/curr/next or slow/fast pointers (`LinkedListVisual.tsx` with a `mode`
  prop, `linkedListFrames.ts`).
- `valid-anagram`: the length check, then a letter-count table that s adds to and t takes
  away from (`AnagramVisual.tsx`, `anagramFrames.ts`).
- `longest-substring-without-repeating-characters`: a window from left to right, a
  last-seen map and the longest window (`LongestSubstringVisual.tsx`,
  `longestSubstringFrames.ts`).
- `subarray-sum-equals-k`: running totals and a total -> times seen map that starts at
  {0: 1} (`SubarraySumVisual.tsx`, `subarraySumFrames.ts`).
- `count-connected-components`: nodes on a circle, the stack, and one colour per component
  (`ComponentsVisual.tsx`, `componentsFrames.ts`, colours in `componentColors.ts`).
- `number-of-islands`, `shortest-path-in-a-grid`: a grid with a stack and island colours, or
  a BFS queue and dist in each cell (`GridVisual.tsx` with a `mode` prop, `gridFrames.ts`).
- `height-of-a-bst`, `lowest-common-ancestor-of-a-bst`, `delete-from-a-bst`: the tree grows
  one insert per step, then the lesson's method runs on it: a stack of (value, depth) pairs,
  the walk down to the split point, or delete x with the successor rule and print the
  preorder (`TreeVisual.tsx` with a `mode` prop, `treeFrames.ts`; `treeLayout.ts` puts each
  node in its value's sorted column and its depth's row, so nodes never overlap).

Each visualization's steps come from a pure function. The player components share
`usePlayback.ts` (state and timer) and `PlaybackControls.tsx` (Play/Pause, step buttons,
Reset, step counter, `SpeedSelect`, `buttonClass`). No charting or animation library is
used.

Frame design decisions:

- Sorting: bubble and insertion sort use adjacent swaps; merge sort shows its comparisons,
  then writes each merged range back in one frame, so every frame is a permutation of the
  input.
- Binary search: in each "discard" step the dimmed range is what is left after it, while
  low, mid and high still show the current step; a not-found final frame has low, high
  and mid set to null, since the pointers have crossed.
- Sum starts from a total of 0 and Maximum from the first number, as the lesson text does.
- Reverse and Palindrome only accept what the graded problem allows: letters, digits and
  single inner spaces for Reverse; lowercase a-z for Palindrome, compared exactly. Each
  swap or comparison is one step; the palindrome check stops at the first mismatch.
- Stack visuals follow the problems: brackets ( ) [ ] { } only, empty counts as balanced;
  postfix pops the right operand first and `/` truncates toward zero, and own input is
  rejected if it is malformed, divides by zero or leaves the 32-bit range; next greater
  means strictly bigger, and positions left on the stack get -1 in one final step. Own
  postfix input allows numbers from 0 to 1000, as the problem does.
- Two Sum looks up target - value before storing the value, so 3 3 with target 6 gives
  0 1; one step per position, stopping at the pair. Own input must have exactly one pair.
- Count inversions follows the lesson: the left half gets the smaller half (2 4 | 1 3 5),
  ties are taken from the left, and every frame's array is a permutation of the input.
- Warm-up: the code shown per language lives in `warmupFrames.ts` and was run in the
  sandbox; the prompt option adds a print line and ends with a failed verdict.

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
