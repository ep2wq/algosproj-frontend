import i18n from './i18n'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const TOKEN_KEY = 'token'

export type User = {
  id: number
  name: string
  email: string
  points: number
  // Only for showing admin links and pages; the backend checks the role on every admin request.
  role: Role
}

export type Role = 'user' | 'admin' | 'owner'

export type AuthResponse = {
  token: string
  user: User
}

export type LessonSummary = {
  id: number
  module_id: number
  slug: string
  title: string
  sort_order: number
}

export type Module = {
  id: number
  slug: string
  title: string
  track: string
  sort_order: number
  lessons: LessonSummary[]
}

export type TestCase = {
  id: number
  input: string
  expected_output: string
}

// Course text arrives in the language of the Accept-Language header, field by field: a field
// without Arabic falls back to English. body_lang and description_lang say which one came.
export type ContentLang = 'ar' | 'en'

export type Problem = {
  id: number
  title: string
  description: string
  description_lang: ContentLang
  difficulty: string
  points: number
  test_cases: TestCase[]
}

export type Lesson = {
  id: number
  module_id: number
  slug: string
  title: string
  body: string | null
  body_lang: ContentLang
  problems: Problem[]
}

export type Topic = {
  slug: string
  title: string
}

// topic and lesson_slug are null for a standalone challenge (a problem without a lesson).
// solved is only ever true for the user whose token was sent.
export type ChallengeSummary = {
  slug: string
  title: string
  difficulty: string
  points: number
  topic: Topic | null
  lesson_slug: string | null
  solved: boolean
}

export type Challenge = Problem & {
  slug: string
  topic: Topic | null
  lesson_slug: string | null
  solved: boolean
}

export const LANGUAGES = ['python', 'java', 'javascript', 'cpp'] as const
export type Language = (typeof LANGUAGES)[number]

export type SubmitStatus = 'passed' | 'failed' | 'error' | 'timeout'

export type VisibleTestResult = {
  passed: boolean
  input: string
  expected: string
  actual: string | null
  error: string | null
}

// Hidden tests only say whether they passed.
export type HiddenTestResult = {
  passed: boolean
}

export type TestResult = VisibleTestResult | HiddenTestResult

export type SubmitResult = {
  status: SubmitStatus
  passed_count: number
  total_count: number
  runtime_ms: number | null
  compile_error: string | null
  points_awarded: number
  results: TestResult[]
}

export type LeaderboardEntry = {
  rank: number
  name: string
  points: number
  is_you: boolean // true only on the row of the user whose token was sent
}

export type MyRank = {
  rank: number
  points: number
}

// Admin area. These responses include hidden test cases; they are only returned to admins.
// Admin responses hold both languages; a *_ar field is null until it is translated.
export type AdminModule = Module & { title_ar: string | null }

export type AdminLesson = {
  id: number
  module_id: number
  slug: string
  title: string
  title_ar: string | null
  body: string | null
  body_ar: string | null
  sort_order: number
}

export type AdminProblem = {
  id: number
  lesson_id: number | null
  slug: string | null
  title: string
  title_ar: string | null
  description: string
  description_ar: string | null
  difficulty: string
  points: number
}

export type AdminTestCase = {
  id: number
  problem_id: number
  input: string
  expected_output: string
  is_hidden: boolean
}

// Laravel's paginated response (only the fields the pages use).
export type Page<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type AdminUserRow = {
  id: number
  name: string
  email: string
  role: Role
  points: number
  banned_at: string | null
  created_at: string
  solved_count: number
}

export type AdminUserDetail = AdminUserRow & {
  ban_reason: string | null
  solved: { title: string; slug: string | null; solved_at: string }[]
  submissions: {
    id: number
    problem: { title: string; slug: string | null }
    language: string
    status: string
    passed_count: number
    total_count: number
    runtime_ms: number | null
    created_at: string
  }[]
}

export type ActivityEntry = {
  id: number
  user_id: number | null
  email: string | null
  event: string
  ip: string | null
  user_agent: string | null
  created_at: string
}

// details.changes holds {old, new} per field, or "changed" for content that is not logged.
export type AuditEntry = {
  id: number
  actor_id: number | null
  actor_email: string
  action: string
  target_type: string | null
  target_id: number | null
  target_label: string | null
  details: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export type UserFilters = { search?: string; role?: string; banned?: string; page?: string }
export type AuditFilters = { action?: string; actor?: string; from?: string; to?: string; page?: string }
export type ActivityFilters = { event?: string; user?: string; from?: string; to?: string; page?: string }

// sort_order is sent as typed; the backend validates it as an integer. An empty *_ar field is
// stored as null (not translated).
export type ModuleInput = { title: string; title_ar: string; slug: string; sort_order: string }
export type LessonInput = {
  module_id: number | null
  title: string
  title_ar: string
  slug: string
  body: string
  body_ar: string
  sort_order: string
}
export type ProblemInput = {
  lesson_id: number | null
  title: string
  title_ar: string
  slug: string
  description: string
  description_ar: string
  difficulty: string
}
export type TestCaseInput = { input: string; expected_output: string; is_hidden: boolean }

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string[]>
  // Set on a 403 for a banned account (login or any request with a token).
  banReason?: string

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}, banReason?: string) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
    this.banReason = banReason
  }
}

// With storage blocked these do nothing, so the app still loads (logged out) instead of crashing.
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Storage blocked.
  }
}

// The auth provider sets this, so a 401 on an authenticated request (or a 403 because the account
// was banned) logs the user out. banReason is set only for a ban.
let onUnauthorized: (banReason?: string) => void = () => {}

export function setUnauthorizedHandler(handler: (banReason?: string) => void) {
  onUnauthorized = handler
}

// Query string from the filters that are set, e.g. "?role=admin&page=2".
function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  // The admin area is English only (its responses hold both languages anyway). Elsewhere the
  // app language picks the course text language. "ar" and "en" are CORS-safelisted values, so
  // the header adds no preflight request.
  const admin = path.startsWith('/admin')
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': admin ? 'en' : i18n.language }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  // The server answers in the Accept-Language language, so its message is shown when it sends
  // one; the frontend's own messages (by HTTP status) cover the rest. The admin area is English
  // only, so its requests always get English messages. The ban reason stays as staff typed it.
  const t = i18n.getFixedT(admin ? 'en' : i18n.language)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, t('errors.network'))
  }

  const data = await response.json().catch(() => null)

  if (response.ok) return data as T

  const serverMessage = typeof data?.message === 'string' ? data.message : ''

  // A dead token. Not for login and register (a wrong password keeps its own message) or logout
  // (the user is leaving anyway, and auth.tsx clears the token).
  if (response.status === 401 && token && !['/login', '/register', '/logout'].includes(path)) {
    setToken(null)
    onUnauthorized()
    throw new ApiError(401, t('errors.sessionEnded'))
  }
  // A banned account: {"message": "This account is banned.", "reason": ...}. With a token it is
  // handled like a 401; on login it is shown on the form.
  if (response.status === 403 && typeof data?.reason === 'string') {
    if (token) {
      setToken(null)
      onUnauthorized(data.reason)
    }
    throw new ApiError(403, serverMessage, {}, data.reason)
  }
  if (response.status === 422) {
    throw new ApiError(422, serverMessage || t('errors.validation'), data?.errors ?? {})
  }
  if (response.status === 429) {
    throw new ApiError(429, t('errors.tooMany'))
  }
  if (response.status === 503) {
    throw new ApiError(503, serverMessage || t('errors.unavailable'))
  }
  const statusMessages: Record<number, string> = {
    401: t('errors.invalidCredentials'),
    403: t('errors.forbidden'),
    404: t('errors.notFound'),
  }
  throw new ApiError(response.status, serverMessage || statusMessages[response.status] || t('errors.status', { status: response.status }))
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>('POST', '/register', { name, email, password })
}

export function login(email: string, password: string) {
  return request<AuthResponse>('POST', '/login', { email, password })
}

export function logout() {
  return request<{ message: string }>('POST', '/logout')
}

export function getMe() {
  return request<User>('GET', '/me')
}

export function getModules() {
  return request<Module[]>('GET', '/modules')
}

export function getLesson(slug: string) {
  return request<Lesson>('GET', `/lessons/${encodeURIComponent(slug)}`)
}

export function getChallenges() {
  return request<ChallengeSummary[]>('GET', '/challenges')
}

export function getChallenge(slug: string) {
  return request<Challenge>('GET', `/challenges/${encodeURIComponent(slug)}`)
}

export function submitSolution(problemId: number, language: Language, code: string) {
  return request<SubmitResult>('POST', `/problems/${problemId}/submit`, { language, code })
}

export function getLeaderboard(limit = 50) {
  return request<LeaderboardEntry[]>('GET', `/leaderboard?limit=${limit}`)
}

export function getMyRank() {
  return request<MyRank>('GET', '/leaderboard/me')
}

// Modules with their lessons (no body).
export function getAdminModules() {
  return request<AdminModule[]>('GET', '/admin/modules')
}

export function createModule(data: ModuleInput) {
  return request<AdminModule>('POST', '/admin/modules', data)
}

export function updateModule(id: number, data: ModuleInput) {
  return request<AdminModule>('PUT', `/admin/modules/${id}`, data)
}

export function deleteModule(id: number) {
  return request<null>('DELETE', `/admin/modules/${id}`)
}

export function getAdminLesson(id: number) {
  return request<AdminLesson>('GET', `/admin/lessons/${id}`)
}

export function createLesson(data: LessonInput) {
  return request<AdminLesson>('POST', '/admin/lessons', data)
}

export function updateLesson(id: number, data: LessonInput) {
  return request<AdminLesson>('PUT', `/admin/lessons/${id}`, data)
}

export function deleteLesson(id: number) {
  return request<null>('DELETE', `/admin/lessons/${id}`)
}

export function getAdminProblems() {
  return request<Pick<AdminProblem, 'id' | 'lesson_id' | 'slug' | 'title' | 'difficulty' | 'points'>[]>('GET', '/admin/problems')
}

export function getAdminProblem(id: number) {
  return request<AdminProblem>('GET', `/admin/problems/${id}`)
}

export function createProblem(data: ProblemInput) {
  return request<AdminProblem>('POST', '/admin/problems', data)
}

export function updateProblem(id: number, data: ProblemInput) {
  return request<AdminProblem>('PUT', `/admin/problems/${id}`, data)
}

export function deleteProblem(id: number) {
  return request<null>('DELETE', `/admin/problems/${id}`)
}

export function getTestCases(problemId: number) {
  return request<AdminTestCase[]>('GET', `/admin/problems/${problemId}/test-cases`)
}

export function createTestCase(problemId: number, data: TestCaseInput) {
  return request<AdminTestCase>('POST', `/admin/problems/${problemId}/test-cases`, data)
}

export function updateTestCase(problemId: number, id: number, data: TestCaseInput) {
  return request<AdminTestCase>('PUT', `/admin/problems/${problemId}/test-cases/${id}`, data)
}

export function deleteTestCase(problemId: number, id: number) {
  return request<null>('DELETE', `/admin/problems/${problemId}/test-cases/${id}`)
}

// Users (admins and owners; some actions are owner only, the backend decides).
export function getAdminUsers(filters: UserFilters) {
  return request<Page<AdminUserRow>>('GET', `/admin/users${query(filters)}`)
}

export function getAdminUser(id: number) {
  return request<AdminUserDetail>('GET', `/admin/users/${id}`)
}

export function getUserActivity(id: number, page = 1) {
  return request<Page<ActivityEntry>>('GET', `/admin/users/${id}/activity${query({ page: String(page) })}`)
}

export function banUser(id: number, reason: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/ban`, { reason })
}

export function unbanUser(id: number) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/unban`)
}

export function logoutUserEverywhere(id: number) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/logout-everywhere`)
}

export function setUserRole(id: number, role: 'user' | 'admin') {
  return request<AdminUserRow>('PUT', `/admin/users/${id}/role`, { role })
}

// amount is sent as typed; the backend validates it as a non-zero integer.
export function adjustUserPoints(id: number, amount: string, reason: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/points`, { amount, reason })
}

export function resetUserProgress(id: number) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/reset-progress`)
}

export function deleteUser(id: number, confirmEmail: string) {
  return request<null>('DELETE', `/admin/users/${id}`, { confirm_email: confirmEmail })
}

// Owner only.
export function getAuditLog(filters: AuditFilters) {
  return request<Page<AuditEntry>>('GET', `/admin/audit-log${query(filters)}`)
}

// Owner only.
export function getActivity(filters: ActivityFilters) {
  return request<Page<ActivityEntry>>('GET', `/admin/activity${query(filters)}`)
}
