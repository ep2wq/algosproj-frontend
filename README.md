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

Only the auth token, the theme choice (`theme`), the language choice (`lang`) and the sound
choice (`sound`) are stored in `localStorage`, every read and write in `try`/`catch`. With
storage blocked the app still loads (logged out) and follows the OS theme and the browser
language, with sound off; the toggles still switch the current page view. No choice is sent to
the server.

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
- Shape, depth and motion (full scales in `docs/ui-restyle.md`, next to this repo's folder):
  `rounded` (4 px) for controls, chips, badges and code values, `rounded-lg` (8 px) for cards,
  panels and drawings. In dark mode `surface` is one step above `paper`. A shadow is only for
  floating things (account menu, skip link) and uses `shadow-(--float-shadow)`, a plain `:root`
  variable redefined in `.dark`, not a `@theme` value, because Tailwind would bake the light
  value into the utility. Every animation or transition in a component is behind `motion-safe:`:
  nothing moves under `prefers-reduced-motion`, nothing loops, nothing autoplays. A base rule in
  `src/index.css` gives links, buttons, selects and inputs a short colour transition, only when
  motion is allowed and never inside Monaco.

## Sound

Sound effects are off by default. `src/sound.ts` makes them with the Web Audio API (an
oscillator and a short gain envelope): no audio files, no dependency. All pitches, lengths and
volumes are in one commented constants block at the top: `MASTER` (0.08, so no peak gain is
above 0.08), `ATTACK`, `STEP_MIN_GAP_MS` (120 ms throttle for the step tick) and a `NOTES`
table per sound. It exports `play(sound)`, `setSoundOn(on)` and `useSoundOn()`.

- The choice is stored under `sound` (`on` or `off`), every read and write in `try`/`catch`.
  With storage blocked it works for the page and reads as off after a reload.
- One `AudioContext`, created lazily and only in a user gesture: a capture-phase
  `pointerdown`/`keydown` listener creates or resumes it only when sound is on, and turning
  sound on (a click) creates it. Never at page load; nothing autoplays. `play()` does nothing
  unless sound is on, the context is running and the document is visible. It never creates a
  context, and failures are silent.
- Sounds: `pass` (rising two notes), `passPoints` (the same plus a bright top note, when points
  were earned), `fail` (soft low falling two notes), `error` (one low soft blip, also for
  compile errors and timeouts), `step` (very quiet tick for each visualization step between the
  first and the last; silent on reset and at the first step), `finish` (small chime on reaching
  the last step going forward) and `toggle` (a tick only when the user turns sound on).
- A sound is never the only signal: each goes with something already visible and announced (the
  result panel's live summary, the step text and "Step n of m"). No sound for typing, page
  loads, hover or navigation.
- Hook-ins: `ProblemSolver.handleSubmit` plays pass, passPoints, fail or error when a result
  arrives; `usePlayback` plays step and finish when the step changes.
- The toggle (`SoundToggle` in `src/components/Layout.tsx`) is a 44 px button with
  `aria-pressed` and the name "Sound effects" (`sound.label`). From `lg` (1024 px) it sits next
  to the theme and language buttons; below `lg` it is a labelled button in a small footer, and
  on phones, when logged in, it is in the account menu instead. In the header it made the
  logged-out Arabic header 3 rows at 360 and 375 px and the logged-in header 2 rows at 768 px;
  placed like this, header heights are unchanged at every width measured (360 to 1024).

## Languages (English and Arabic)

The interface is English or Arabic (right to left). Course text (module, lesson and problem
titles, lesson bodies, problem descriptions) comes from the backend in the app language, field
by field: whatever is not translated yet comes in English and is shown left to right inside the
Arabic page. The translated modules are listed in the backend's Arabic seed files
(`database/seeders/data/ar/*.php`) and the `GLOSSARY.md` next to them (rules: the backend
README, "Content languages").
Visualizations are translated too; their drawings stay left to right.

- **Where strings live:** no user-visible text is written in components, visual code or
  frame functions. i18next with react-i18next, strings bundled (no network loading, no
  detector or backend plugins); `src/i18n.ts` sets it up.
  - `src/locales/en.json` (the source and the fallback) and `src/locales/ar.json`: pages and
    components, grouped by area (`nav`, `common`, `auth`, `lesson`, `challenges`, `solver`,
    `result`, `errors`, ...). `admin.*` is in `en.json` only (see "Admin area").
  - `src/locales/visuals.en.json` and `visuals.ar.json`: the `visuals` namespace, one group per
    visualization plus `common` and `callTree`. `src/visuals/i18n.ts` registers it, and every
    visual imports it (through `PlaybackControls`), so these strings (about 130 kB, both
    languages) load with the first visualization instead of in the main bundle.
- **Adding a string:** add the key to `en.json` and `ar.json` (or the two `visuals.*` files),
  then call `t('group.key', { params })`. Whole sentences only: interpolate values
  (`{{count}}`), never join sentence fragments; joining whole sentences with a space is fine.
  A count uses i18next plurals (`count` is reserved for them): `_one`/`_other` in English and
  all six Arabic forms (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`). Lists use
  `joinAnd()` in `src/visuals/i18n.ts` ("1, 2 and 3" / "1، 2 و3").
- **Frame functions** take the translate function as their last argument
  (`sumFrames(array, t)`), so they stay pure (same input and language, same frames) and
  each sentence stays next to the logic that picks it. Components pass
  `useTranslation('visuals').t` and recompute the frames when the language changes.
- **Arabic text with English terms:** visual step text, hints, errors and labels are shown
  through `TextWithCode`, the lesson renderer: `~term~` for an English term and `` `code` ``
  for values, expressions and identifiers, as in the lessons. Negative numbers and
  expressions must be in `` `code` `` in Arabic, or they reorder in right-to-left text.
  `aria-label`s and placeholders can't use markers, so their Arabic has none. English strings
  never contain `~`.
- **Guards** (`npm run lint` runs both): oxlint's `react/jsx-no-literals` fails on literal
  text in JSX; the exceptions (`.oxlintrc.json`) are spacing, punctuation and symbols (`✓`,
  `♛`, `·`, ...), the brand name and the code labels `null`, `top`, `sum`, `count`, `n`, `k`,
  `pos`. The rule doesn't see attributes: never write a literal `aria-label`, `title`,
  `placeholder` or `alt`. `npm run check:i18n` (`scripts/check-i18n.mjs`) fails when
  `en.json`/`ar.json` or the two `visuals.*` files have different keys (`admin.*` may be
  missing from `ar.json`), when a plural key lacks a form, when the code uses a key that is
  not in English (a `${...}` part of a key matches anything), or when an English string has a
  `~`.
- **Adding a language** (for example French): add `fr.json` and `visuals.fr.json` with the
  same keys, register them in `src/i18n.ts` and `src/visuals/i18n.ts`, add the code to
  `AppLanguage`, the language button in `Layout.tsx` and the inline script in `index.html`,
  extend `PLURALS` in `scripts/check-i18n.mjs`, and add its rules for `ar` in
  `SetContentLanguage` and the backend `lang/` folder.
- **The language button** in the main navigation shows the other language in that language
  ("العربية" with `lang="ar"` while in English, "English" with `lang="en"` while in Arabic),
  plus hidden text saying what it does. First visit: Arabic if `navigator.languages` lists
  Arabic first, otherwise English. After the first click the choice is stored under `lang`
  (`en` or `ar`) and wins. `lang` and `dir` on `<html>` change live, and the inline script in
  `index.html` sets them before the first paint, so an Arabic page never flashes left to
  right. Every page renders a React `<title>` (hoisted into `<head>`) from `titles.page`
  ("{{name}} · AlgosProj"), where the name is the page heading's key or the lesson's or
  challenge's own title; `AuthForm` sets it for login and register. The admin area has one
  fixed English title (`admin.pageTitle`, in `AdminRoute`). Titles follow the language
  change. `index.html` keeps "AlgosProj" until the app loads.
- **Layout:** Tailwind's logical classes only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`,
  `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`), never `ml-`,
  `pr-`, `left-`, `text-right` and the like, so the layout flips with `dir`. Where a logical
  class can't do it (transforms, SVG, absolute offsets), use an `rtl:` variant. Numeric table
  columns use `text-end`. Header cells inherit their table's alignment (a base rule in
  `src/index.css`, because the browser's own `th` style would center them).
- **Always English and left to right:** the Monaco editor, code blocks, test inputs and
  outputs, the visualization drawings and data inputs (`dir="ltr"` on each drawing, list,
  value box and input, because the step text says "left", "right" and "front on the left"),
  email inputs (`dir="ltr"`) and the whole admin area (`/admin/*`, staff only, wrapped in `lang="en" dir="ltr"` in
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
  each inline code part and the non-space text touching it (such as "(", ")." , "،" or "و")
  share one `inline-block max-w-full` span, so a line never breaks between them, and a group
  longer than the line wraps inside its own box. Text that would split a `~term~` marker
  stays outside.
- **English terms in Arabic text:** Arabic lessons keep technical terms in English as
  `~term~` markers (`الـ~array~` for the definite form). `splitTerms` in `src/lessonText.ts`
  finds them in prose only, after code blocks and inline code are split off, and `TextWithCode`
  renders each as plain text in `<bdi dir="ltr" lang="en">` (English font, read in English by
  screen readers), in paragraphs, list items, headings and problem descriptions. A marker starts
  and ends with a non-space character; a lone or empty `~` stays as text. English text has no
  markers, so it renders exactly as before. `~` is not mirrored, so it stays readable in the
  right-to-left admin textarea.
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
- **Server messages:** the backend answers in the `Accept-Language` language (its `lang/`
  files), so its message is shown as sent: login and register errors, field errors, the ban
  message, submit errors and 503s are Arabic in Arabic mode. The frontend's own messages
  (`errors.*`) cover a network error, an ended session (401 with a token), 429 and any
  response without a message. Admin requests always send `en`, so admin messages are English.
  Still not translated: the ban reason (typed by staff, shown `lang="en" dir="auto"`) and
  compiler or runtime output from the sandbox (shown left to right).

## Pages

- `/` lessons grouped by track, `/lessons/:slug` lesson with editor and submit,
  `/login`, `/register`, `/leaderboard`, `/admin/*` (admins and owners, see "Admin area").
  Unknown paths show "Page not found".
  `Layout` starts with a "Skip to content" link (`nav.skipToContent`), visible only on keyboard
  focus, that jumps to `<main id="main">`.
  Below `sm`, a logged-in user gets an account button (`nav.account`) in the header. It opens a
  panel with the full name (`dir="auto"`), the Admin link (staff only) and Log out. It is a
  disclosure (`aria-expanded`, `aria-controls`), not a `role="menu"`. Escape, a click outside
  or focus leaving closes it, and a route change closes it. From `sm` up the header is unchanged.
- `/challenges` every problem in one list: search by title, filters for difficulty, topic
  and (when logged in) solved status, all applied in the browser; "Showing X of Y" is
  announced with `aria-live`. Below `md` the rows become cards. `/challenges/:slug` solves one
  problem, with links back to the list and to its lesson.

On the home page each lesson row shows difficulty bars (the hardest problem of the lesson) and,
when logged in, a solved check. Both come from the existing `GET /api/challenges` response
(`lesson_slug`, `difficulty`, `solved`); there is no backend change. In a problem statement, a
line that is only Input, Output or Constraints (`~Input~` etc. in Arabic) renders as a small
heading at the examples' level (h2 on the challenge page, h3 in a lesson). Display only.

`src/components/ProblemSolver.tsx` holds the statement, examples, language picker, editor,
Submit and result for one problem. The lesson page uses it through `ProblemCard` (which adds
the problem heading) and the challenge page uses it directly; its `onPassed` callback lets
the challenge page mark the problem solved without reloading.

Lesson text is parsed by `src/lessonText.ts` (pure functions: headings `## `, `- ` lists,
4-space-indented code blocks, paragraphs, then `` `inline code` `` and `~term~` markers) and rendered by `src/components/LessonBody.tsx`
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
  real `LessonBody` (the Arabic one with `lang="ar"`, right to left). A one-line hint under the
  Arabic body explains the `~term~` marker.
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

Admin strings: every admin text is a key under `admin.*` in `src/locales/en.json` only (the
shared `BannedBadge`, `ConfirmAction`, `DeleteButton` and `Pagination` use them too). In
Arabic mode they fall back to English, and `AdminRoute` keeps the area `lang="en" dir="ltr"`.
To enable Arabic for admin (not done): remove the `lang="en" dir="ltr"` wrapper in
`AdminRoute.tsx` and the `admin` rule in `api.ts` (`Accept-Language: en` for `/admin`), add
`admin.*` to `ar.json` (then `npm run check:i18n` requires every key), make `formatTime` in
`pages/admin/format.ts` use the app language, and check every admin page right to left
(tables, the test case form, the user actions, the audit log details) at 375 px.

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

Each visualization's steps come from a pure function that takes the translate function as
its last argument (README "Languages"). The player components share
`usePlayback.ts` (state and timer) and `PlaybackControls.tsx` (Play/Pause, step buttons,
Reset, step counter, `SpeedSelect`, `buttonClass`). No charting or animation library is
used. The progress track in `PlaybackControls` is hidden from screen readers ("Step n of m"
says the same). Legend swatches must use the same classes as the real cells. A drawing wider
than its box uses `useScrollCue` (`src/visuals/useScrollCue.ts`) with the `scroll-fade` utility.

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
