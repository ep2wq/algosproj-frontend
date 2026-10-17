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

Only the auth token, the theme choice (`theme`) and the language choice (`lang`) are stored
in `localStorage`, every read and write in `try`/`catch`. With storage blocked the app still
loads (logged out) and follows the OS theme and the browser language; both toggles still
switch the current page view. Neither choice is sent to the server.

## Themes

The theme button (sun and moon icon, a real `<button>`, 44 px) in the main navigation switches
between Light and Dark; its accessible name says what it will do ("Switch to dark theme").
Until it is clicked, the app follows the OS setting (`prefers-color-scheme`) and changes live
when the OS setting changes. After the first click the choice is stored under `theme`
(`light` or `dark`) and wins from then on. Any other stored value, such as an old `system`,
is ignored and the OS is followed.

- `src/theme.ts` puts a `dark` class and `color-scheme` (so scrollbars, form controls and the
  browser UI match) on `<html>`, and exposes `useTheme()` and `toggleTheme()`. A small inline
  script in `index.html` does the same before the first paint, so a dark page never flashes
  light; keep the two in step.
- Colors are tokens in `src/index.css` (`paper`, `surface`, `ink`, `muted`, `line`, `field`,
  `accent`, `accent-soft`, `pass`, `fail`, `warn`, `inverse`). `.dark` redefines them, so a
  token class such as `bg-surface` or `text-muted` is right in both themes with no `dark:`
  class. `surface` is the card and input background, `inverse` the text on a solid `accent`,
  `pass`, `fail`, `warn` or `ink` fill, `field` the border of inputs and of shapes that must
  stay visible, and `line` only for decorative borders.
- Rule for new components: use the tokens. Any other color (a Tailwind palette color such as
  the component colors in `src/visuals/componentColors.ts`, or `bg-amber-100` in the grid
  visual) needs its own `dark:` class, which works through `@custom-variant dark` in
  `src/index.css`. Never `white`, `black` or a hex value in a component.
- Contrast rule, in both themes: normal text at least 4.5:1 against its background; large
  text and things that carry meaning without text (input borders, icons, the shapes and
  outlines of the visualizations) at least 3:1. Never tell states apart by color alone; keep
  a label, symbol, shape or text cue. Check new colors with axe-core's `color-contrast` rule
  in both themes.
- The Monaco editor uses `vs` or `vs-dark` from `useTheme()`; switching restyles the open
  editor without remounting it, so typed code stays.

## Languages (English and Arabic)

The interface is English or Arabic (right to left). Course text (module, lesson and problem
titles, lesson bodies, problem descriptions) comes from the backend in the app language, field
by field: whatever is not translated yet comes in English and is shown left to right inside the
Arabic page. Only the first module is translated so far. Visualizations stay English.

- **Translation:** i18next with react-i18next, with the strings bundled (no network loading,
  no detector or backend plugins). `src/i18n.ts` sets it up; the strings are in
  `src/locales/en.json` (the source and the fallback) and `src/locales/ar.json`, grouped by
  page or component. Rule: every new user-visible string (text, labels, placeholders,
  `aria-label`s, screen-reader text, errors built in the frontend) goes through `t()` and into
  both files with the same keys. A count uses i18next plurals: `_one`/`_other` in English and
  all six Arabic forms (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`).
- **The language button** in the main navigation shows the other language in that language
  ("العربية" with `lang="ar"` while in English, "English" with `lang="en"` while in Arabic),
  plus hidden text saying what it does. First visit: Arabic if `navigator.languages` lists
  Arabic first, otherwise English. After the first click the choice is stored under `lang`
  (`en` or `ar`) and wins. `lang` and `dir` on `<html>` change live, and the inline script in
  `index.html` sets them before the first paint, so an Arabic page never flashes left to
  right. The app does not set `document.title` (it stays "AlgosProj").
- **Layout:** Tailwind's logical classes only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`,
  `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`), never `ml-`,
  `pr-`, `left-`, `text-right` and the like, so the layout flips with `dir`. Where a logical
  class can't do it (transforms, SVG, absolute offsets), use an `rtl:` variant. Numeric table
  columns use `text-end`. Header cells inherit their table's alignment (a base rule in
  `src/index.css`, because the browser's own `th` style would center them).
- **Always English and left to right:** the Monaco editor, code blocks, test inputs and
  outputs, every visualization (wrapped in `lang="en" dir="ltr"`), email inputs (`dir="ltr"`)
  and the whole admin area (`/admin/*`, staff only, wrapped in `lang="en" dir="ltr"` in
  `AdminRoute`). Names people chose (header, leaderboard, admin lists) use `dir="auto"`.
- **Course text language:** every request sends `Accept-Language` with the app language (`ar`
  or `en`; admin requests always `en`). Both values are CORS-safelisted, so no extra preflight.
  The home page, lesson page, Challenges list and challenge page load again when the language
  changes, without a reload: the old text stays until the new arrives, so the editor is not
  remounted and keeps the typed code, and the Challenges filters are kept. Search matches the
  title as shown (Arabic where translated).
- **Content wrapper:** course text is rendered through `src/components/Content.tsx` with a
  `lang` prop (`LessonBody` takes one too). Lesson bodies and problem descriptions pass the
  `body_lang` / `description_lang` the API returns (`"ar"` gives `dir="rtl"`, `"en"`
  `dir="ltr"`); titles pass `"auto"`: `dir="auto"` and `lang` from the text (`src/textLang.ts`,
  Arabic letters mean `ar`). Lists, headings and paragraphs follow that direction; code blocks
  stay LTR. `` `inline code` `` in lesson text and problem descriptions is a left-to-right
  isolate (`TextWithCode` in `LessonBody.tsx`), so expressions keep their order inside Arabic;
  it wraps as one unit, with a word joiner keeping touching punctuation on its line.
- **Numbers and dates:** always Western digits (0-9) in both languages, so they match the code
  and test data. Dates and times go through `formatDateTime()` in `src/i18n.ts`: Intl with
  the Gregorian calendar and Latin digits (`ar-u-ca-gregory-nu-latn` for Arabic), never Hijri.
  Only the admin area shows dates today, in English.
- **Font:** Noto Sans Arabic (variable weights), self-hosted from
  `@fontsource-variable/noto-sans-arabic`. `src/i18n.ts` imports its CSS only when Arabic is
  active, so English pages load no extra font. Under `:root[lang="ar"]` it goes ahead of the
  system font and lines are a little taller; English passages (`[lang="en"]`) inside an
  Arabic page keep the English font and line heights. `letter-spacing` and `text-transform`
  never apply to Arabic text (a rule on `:lang(ar)`), because they break letter joining.
- **Server messages:** the backend speaks English. In Arabic, the messages the frontend picks
  by status are Arabic (network error, session ended, 401 wrong login, 403, 404, 429, 503,
  other failures); the server's own English text is shown only for field errors and the ban
  reason, marked `lang="en"`. English shows the server's text as before; admin requests are
  always English. English server messages that can still appear in Arabic mode:
  - register and login field errors from Laravel's validation, such as "The email has
    already been taken.", "The password field must be at least 8 characters.", "The email
    field must be a valid email address.", "The name field is required.";
  - submit field errors: "The code may not be larger than 64 KB.", "The code field is
    required.", "The selected language is invalid.";
  - the ban reason, written by staff;
  - compiler and runtime error output from the sandbox (program output, shown left to right).

## Pages

- `/` lessons grouped by track, `/lessons/:slug` lesson with editor and submit,
  `/login`, `/register`, `/leaderboard`, `/admin/*` (admins and owners, see "Admin area").
  Unknown paths show "Page not found".
- `/challenges` every problem in one list: search by title, filters for difficulty, topic
  and (when logged in) solved status, all applied in the browser; "Showing X of Y" is
  announced with `aria-live`. Below `md` the rows become cards. `/challenges/:slug` solves one
  problem, with links back to the list and to its lesson.

`src/components/ProblemSolver.tsx` holds the statement, examples, language picker, editor,
Submit and result for one problem. The lesson page uses it through `ProblemCard` (which adds
the problem heading) and the challenge page uses it directly; its `onPassed` callback lets
the challenge page mark the problem solved without reloading.

Lesson text is parsed by `src/lessonText.ts` (a pure function: headings `## `, `- ` lists,
4-space-indented code blocks, paragraphs) and rendered by `src/components/LessonBody.tsx`
as plain React elements. The format is documented in the backend README.

## Admin area

Content (modules, lessons, problems, test cases) lives in the backend database and is
edited here, and users are managed here. The user object has a `role` (`user`, `admin` or
`owner`); the "Admin" link in the main navigation shows for admins and owners. Make someone
an owner or admin on the backend with `php artisan user:make-admin <email> [--owner]`; an
owner can then switch other accounts between user and admin on their user page. The
backend README ("Roles") has the full permissions table.

A tab row at the top of every admin page links Content and Users, plus Audit log and
Activity for owners.

- `/admin` lists every module with its lessons and their problems, then the standalone
  problems, with Edit and Add links.
- `/admin/modules/new`, `/admin/modules/:id`: title, Title (Arabic), slug, order.
- `/admin/lessons/new?module=<id>`, `/admin/lessons/:id`: module, title, Title (Arabic), slug,
  order, and the body and Body (Arabic) in textareas, each with a live preview rendered by the
  real `LessonBody` (the Arabic one with `lang="ar"`, right to left).
- `/admin/problems/new?lesson=<id>`, `/admin/problems/:id`: title, Title (Arabic), slug, lesson
  (or none for a standalone challenge), difficulty (points follow it, set by the server),
  description, Description (Arabic), and
  a table of test cases with add, edit, delete and a Hidden checkbox. Long tests are cut to
  200 characters in the table; the edit form shows them in full.
- The Arabic fields are optional and right to left (`dir="rtl"`) inside the English admin
  area; an empty one is saved as "not translated" and the site shows the English.

- `/admin/users`: search by name or email, role and banned filters, 25 per page; search,
  filters and page are in the address. A table from `md` up, cards below; banned accounts
  show a "Banned" badge with text.
- `/admin/users/:id`: details, solved problems, the last 20 submissions, "Recent activity"
  (25 per page) and the actions the current role may use: ban (reason required), unban and
  log out everywhere; for owners also change role, adjust points, reset progress and delete
  (type the user's email to confirm). Each opens an in-page confirmation (`ConfirmAction`,
  no browser dialog) and shows the server's 403 or 422 message under it. Nothing is shown
  for your own account or an owner. The backend enforces all of it.
- `/admin/audit-log` and `/admin/activity` (owners only, `OwnerRoute`; admins get "Page not
  found"): filters for action or event, actor or user (id or email), and a UTC date range;
  50 per page; audit details are shown as lines such as `title: Old → New`.

Banned accounts: login shows "This account is banned. Reason: ..." from the 403. A request
with a token that gets that 403 is handled like a 401: the token is cleared and the user goes
to `/login`, which shows the ban message. Banning deletes the user's tokens, so an open tab
usually gets a 401 instead and lands on `/login` with the session notice below; the reason
then shows when they try to log in.

Session ended: when an authenticated request gets a 401 and a token was sent, the token is
cleared and the user goes to `/login`, which shows "Your session has ended. Please log in
again." It is not shown after clicking Log out (a 401 from `/logout` only clears the token),
and the 401 of a wrong password on login or register keeps its own message. The notice
lives in the navigation state, so it is gone after logging in.

`src/components/AdminRoute.tsx` wraps these routes: guests and users who are neither admin
nor owner get the same "Page not found" as an unknown path. That is only convenience; the backend answers every
admin request from a guest with 401 and from a non-admin with 403. Server validation errors
show under their fields. Deleting asks "Delete ...?" in place (`DeleteButton`, no browser
dialog), and a refusal (409: a module with lessons, a lesson with problems, a problem users
have solved) is shown next to the button. Edits show on the public pages at once.

## Visualizations

`src/visuals/index.ts` maps a lesson slug to a lazy-loaded component, shown between the
lesson text and the problems. 27 of the 65 lessons have one; the Programming basics, Core
programming, Object-oriented programming, Algorithm basics, Heaps and priority queues, Greedy
algorithms, Dynamic programming basics, Dynamic programming: tables, Tries and union-find and
Bit manipulation and math lessons (38 in all) have none yet:

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
- `binary-strings`, `permutations`: the call tree grows one call per step with choose,
  explore and undo, next to cur, the call stack and the printed results; n from 1 to 4, or
  1 to 4 items of one letter or digit (`BinaryStringsVisual.tsx`, `binaryStringFrames.ts`,
  `PermutationsVisual.tsx`, `permutationFrames.ts`; `CallTreeDiagram.tsx` draws the tree
  and `callTree.ts` lays it out, one column per leaf).
- `n-queens`: the board with the queens, the squares they attack, the square being tried
  and the queen removed on a backtrack, a row-by-row trail of the columns tried, and the
  solutions found; n from 4 to 5 (`QueensVisual.tsx`, `queensFrames.ts`).

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
