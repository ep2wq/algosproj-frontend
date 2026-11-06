import { recordFailedRequest } from './capture'
import i18n from './i18n'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

// Logins used to keep a token here. It means nothing now (the session cookie does the work), so
// a leftover one is removed once at startup.
try {
  localStorage.removeItem('token')
} catch {
  // Storage blocked.
}

export type User = {
  id: string
  name: string
  email: string
  points: number
  // Only for showing admin links and pages; the backend checks the role on every admin request.
  role: Role
  // Submitting code needs a verified email; the backend checks it on every submit.
  email_verified: boolean
}

export type Role = 'user' | 'admin' | 'owner'

export type AuthResponse = {
  user: User
}

export type LessonSummary = {
  id: string
  module_id: string
  slug: string
  title: string
  sort_order: number
}

export type Module = {
  id: string
  slug: string
  title: string
  track: string
  sort_order: number
  lessons: LessonSummary[]
}

export type TestCase = {
  id: string
  input: string
  expected_output: string
}

// Course text arrives in the language of the Accept-Language header, field by field: a field
// without Arabic falls back to English. body_lang and description_lang say which one came.
export type ContentLang = 'ar' | 'en'

export type Problem = {
  id: string
  title: string
  description: string
  description_lang: ContentLang
  difficulty: string
  points: number
  test_cases: TestCase[]
}

export type Lesson = {
  id: string
  module_id: string
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
// solved is only ever true for the logged-in user.
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
  is_you: boolean // true only on the logged-in user's row
}

export type MyRank = {
  rank: number
  points: number
}

// Admin area. These responses include hidden test cases; they are only returned to admins.
// Admin responses hold both languages; a *_ar field is null until it is translated.
export type AdminModule = Module & { title_ar: string | null }

export type AdminLesson = {
  id: string
  module_id: string
  slug: string
  title: string
  title_ar: string | null
  body: string | null
  body_ar: string | null
  sort_order: number
}

export type AdminProblem = {
  id: string
  lesson_id: string | null
  slug: string | null
  title: string
  title_ar: string | null
  description: string
  description_ar: string | null
  difficulty: string
  points: number
}

export type AdminTestCase = {
  id: string
  problem_id: string
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
  id: string
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
    id: string
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
  id: string
  user_id: string | null
  email: string | null
  event: string
  ip: string | null
  user_agent: string | null
  created_at: string
}

// details.changes holds {old, new} per field, or "changed" for content that is not logged.
export type AuditEntry = {
  id: string
  actor_id: string | null
  actor_email: string
  action: string
  target_type: string | null
  target_id: string | null
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
  module_id: string | null
  title: string
  title_ar: string
  slug: string
  body: string
  body_ar: string
  sort_order: string
}
export type ProblemInput = {
  lesson_id: string | null
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
  // Set on a 403 for a banned account (login, or any request while logged in).
  banReason?: string
  // A 403 because the email is not verified yet (submit). The user stays logged in.
  emailUnverified: boolean
  // The API path without the query, set by request() (for a bug report from an error screen).
  path?: string

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}, banReason?: string, emailUnverified = false) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
    this.banReason = banReason
    this.emailUnverified = emailUnverified
  }
}

// True while the app has a logged-in user (from /me, login or register). Only then does a 401 mean
// the session ended; a guest's 401 (the /me at startup) means nothing.
let signedIn = false

// The session is an HttpOnly cookie that JavaScript never sees. Against CSRF, Laravel also sets the
// readable XSRF-TOKEN cookie, which every state-changing request sends back in X-XSRF-TOKEN.
function xsrfToken(): string | null {
  const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : null
}

// Gets a fresh XSRF-TOKEN cookie (and a session) before login and register, and after a 419.
async function refreshCsrfCookie() {
  try {
    await fetch(`${BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include', headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(0, i18n.t('errors.network'))
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

// Every failed call also goes into the bug report buffer (capture.ts): method, path without the
// query, status and message; never a body, header or cookie.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await send<T>(method, path, body)
  } catch (error) {
    if (error instanceof ApiError) {
      error.path = path.split(/[?#]/)[0]
      recordFailedRequest(method, path, error.status, error.message, error.banReason ? 'banned' : error.emailUnverified ? 'email_unverified' : undefined)
    }
    throw error
  }
}

// A FormData body (the bug report) is sent as multipart, anything else as JSON.
async function send<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  // The admin area is English only (its responses hold both languages anyway). Elsewhere the
  // app language picks the course text language. "ar" and "en" are CORS-safelisted values, so
  // the header adds no preflight request.
  const admin = path.startsWith('/admin')
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': admin ? 'en' : i18n.language }
  const form = body instanceof FormData
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json'
  const xsrf = method === 'GET' ? null : xsrfToken()
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  // The server answers in the Accept-Language language, so its message is shown when it sends
  // one; the frontend's own messages (by HTTP status) cover the rest. The admin area is English
  // only, so its requests always get English messages. The ban reason stays as staff typed it.
  const t = i18n.getFixedT(admin ? 'en' : i18n.language)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
      // Sends the session cookie to the API (another origin: same site, another port or subdomain).
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, t('errors.network'))
  }

  const data = await response.json().catch(() => null)

  if (response.ok) return data as T

  const serverMessage = typeof data?.message === 'string' ? data.message : ''

  // 419: the CSRF token is missing or stale (the session expired or changed). Get a fresh one and
  // try once more; if that fails too, the session is unusable and is treated as ended.
  if (response.status === 419) {
    if (!retried) {
      await refreshCsrfCookie()
      return send<T>(method, path, body, true)
    }
    if (signedIn) {
      signedIn = false
      onUnauthorized()
    }
    throw new ApiError(419, t('errors.sessionEnded'))
  }
  // An ended session. Not for login and register (a wrong password keeps its own message) or logout
  // (the user is leaving anyway, and auth.tsx clears the user).
  if (response.status === 401 && signedIn && !['/login', '/register', '/logout'].includes(path)) {
    signedIn = false
    onUnauthorized()
    throw new ApiError(401, t('errors.sessionEnded'))
  }
  // Submit without a verified email: {"message", "reason": "email_unverified"}. Not a ban, so the
  // user stays logged in; the page shows how to verify.
  if (response.status === 403 && data?.reason === 'email_unverified') {
    throw new ApiError(403, serverMessage || t('verify.required'), {}, undefined, true)
  }
  // A banned account: {"message": "This account is banned.", "reason": ...}. When logged in it is
  // handled like a 401; on login it is shown on the form.
  if (response.status === 403 && typeof data?.reason === 'string') {
    if (signedIn) {
      signedIn = false
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

// The hidden field of login, register and forgot password (AuthForm `honeypot`; backend README
// "Security events and IP bans"). People never see or fill it; a bot that fills it gets an ordinary
// failure. Sent only when filled, so a person's request is unchanged.
export const HONEYPOT_FIELD = 'form_extra'

function trap(honeypot: string) {
  return honeypot ? { [HONEYPOT_FIELD]: honeypot } : {}
}

// Login and register start a session (the server sets the cookie); the response has only the user.
// Register is only called once the Terms and Privacy box is checked (AuthForm); the server records it.
export async function register(name: string, email: string, password: string, honeypot = '') {
  await refreshCsrfCookie()
  const result = await request<AuthResponse>('POST', '/register', { name, email, password, accepted_terms: true, ...trap(honeypot) })
  signedIn = true
  return result
}

export async function login(email: string, password: string, remember: boolean, honeypot = '') {
  await refreshCsrfCookie()
  const result = await request<AuthResponse>('POST', '/login', { email, password, remember, ...trap(honeypot) })
  signedIn = true
  return result
}

// Google and GitHub sign-in (backend README "Social login"). The button is a link to the API, a
// full page visit: the API sends the browser to the provider and back, then to "/" (logged in),
// "/auth/complete" (a new account) or "/login?error=...".
export type SocialProvider = 'google' | 'github'

export const SOCIAL_PROVIDER_NAMES: Record<SocialProvider, string> = { google: 'Google', github: 'GitHub' }

export function socialSignInUrl(provider: SocialProvider) {
  return `${BASE_URL}/auth/${provider}/redirect`
}

// The verified sign-in of a new email, kept in the session until the account is made (404 when
// there is none or it expired).
export type PendingSignIn = { name: string; email: string; provider: SocialProvider }

export function getPendingSignIn() {
  return request<PendingSignIn>('GET', '/auth/pending')
}

// Creates the account like register (only once the Terms box is checked); 410 when the pending
// sign-in is gone.
export async function completeSignIn(name: string) {
  await refreshCsrfCookie()
  const result = await request<AuthResponse>('POST', '/auth/complete', { name, accepted_terms: true })
  signedIn = true
  return result
}

export async function logout() {
  signedIn = false
  return request<{ message: string }>('POST', '/logout')
}

// Email verification and password reset (backend README "Email"). The guest requests need the
// CSRF cookie first, like login. Forgot password always answers the same, whether or not the
// account exists.
export function resendVerification() {
  return request<{ message: string }>('POST', '/email/verification-notification')
}

export async function forgotPassword(email: string, honeypot = '') {
  await refreshCsrfCookie()
  return request<{ message: string }>('POST', '/forgot-password', { email, ...trap(honeypot) })
}

export async function resetPassword(token: string, email: string, password: string, passwordConfirmation: string) {
  await refreshCsrfCookie()
  return request<{ message: string }>('POST', '/reset-password', { token, email, password, password_confirmation: passwordConfirmation })
}

export async function getMe() {
  const user = await request<User>('GET', '/me')
  signedIn = true
  return user
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

export function submitSolution(problemId: string, language: Language, code: string) {
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

export function updateModule(id: string, data: ModuleInput) {
  return request<AdminModule>('PUT', `/admin/modules/${id}`, data)
}

export function deleteModule(id: string) {
  return request<null>('DELETE', `/admin/modules/${id}`)
}

export function getAdminLesson(id: string) {
  return request<AdminLesson>('GET', `/admin/lessons/${id}`)
}

export function createLesson(data: LessonInput) {
  return request<AdminLesson>('POST', '/admin/lessons', data)
}

export function updateLesson(id: string, data: LessonInput) {
  return request<AdminLesson>('PUT', `/admin/lessons/${id}`, data)
}

export function deleteLesson(id: string) {
  return request<null>('DELETE', `/admin/lessons/${id}`)
}

export function getAdminProblems() {
  return request<Pick<AdminProblem, 'id' | 'lesson_id' | 'slug' | 'title' | 'difficulty' | 'points'>[]>('GET', '/admin/problems')
}

export function getAdminProblem(id: string) {
  return request<AdminProblem>('GET', `/admin/problems/${id}`)
}

export function createProblem(data: ProblemInput) {
  return request<AdminProblem>('POST', '/admin/problems', data)
}

export function updateProblem(id: string, data: ProblemInput) {
  return request<AdminProblem>('PUT', `/admin/problems/${id}`, data)
}

export function deleteProblem(id: string) {
  return request<null>('DELETE', `/admin/problems/${id}`)
}

export function getTestCases(problemId: string) {
  return request<AdminTestCase[]>('GET', `/admin/problems/${problemId}/test-cases`)
}

export function createTestCase(problemId: string, data: TestCaseInput) {
  return request<AdminTestCase>('POST', `/admin/problems/${problemId}/test-cases`, data)
}

export function updateTestCase(problemId: string, id: string, data: TestCaseInput) {
  return request<AdminTestCase>('PUT', `/admin/problems/${problemId}/test-cases/${id}`, data)
}

export function deleteTestCase(problemId: string, id: string) {
  return request<null>('DELETE', `/admin/problems/${problemId}/test-cases/${id}`)
}

// Users (admins and owners; some actions are owner only, the backend decides).
export function getAdminUsers(filters: UserFilters) {
  return request<Page<AdminUserRow>>('GET', `/admin/users${query(filters)}`)
}

export function getAdminUser(id: string) {
  return request<AdminUserDetail>('GET', `/admin/users/${id}`)
}

export function getUserActivity(id: string, page = 1) {
  return request<Page<ActivityEntry>>('GET', `/admin/users/${id}/activity${query({ page: String(page) })}`)
}

export function banUser(id: string, reason: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/ban`, { reason })
}

export function unbanUser(id: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/unban`)
}

export function logoutUserEverywhere(id: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/logout-everywhere`)
}

export function setUserRole(id: string, role: 'user' | 'admin') {
  return request<AdminUserRow>('PUT', `/admin/users/${id}/role`, { role })
}

// amount is sent as typed; the backend validates it as a non-zero integer.
export function adjustUserPoints(id: string, amount: string, reason: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/points`, { amount, reason })
}

export function resetUserProgress(id: string) {
  return request<AdminUserRow>('POST', `/admin/users/${id}/reset-progress`)
}

export function deleteUser(id: string, confirmEmail: string) {
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

// Security events and IP bans, owner only (backend README "Security events and IP bans"). An event
// adds up repeats from one IP within 10 minutes (count). detail holds only the route, the rule that
// matched, field names and at most 200 characters of a flagged value.
export type SecurityEventType =
  | 'forbidden_admin_route'
  | 'unauthenticated_admin_route'
  | 'honeypot_filled'
  | 'decoy_url'
  | 'suspicious_input'
  | 'rate_limited'
  | 'csrf_mismatch'
export type SecurityEvent = {
  id: string
  type: SecurityEventType
  ip: string
  user_agent: string | null
  method: string
  path: string
  user_id: string | null
  user: { id: string; name: string; email: string } | null
  detail: { route?: string; rule?: string; fields?: string[]; value?: string; required?: string } | null
  count: number
  first_seen_at: string
  last_seen_at: string
  seen_at: string | null
  // The event's IP has a ban in force.
  ip_banned: boolean
}
export type SecurityEventFilters = { type?: string; status?: string; ip?: string; page?: string }
export type BanDuration = '1h' | '24h' | '7d' | 'permanent'
export type BannedIp = {
  id: string
  ip: string
  expires_at: string | null
  note: string | null
  banned_by: string | null
  banned_by_user: { id: string; name: string; email: string } | null
  blocked_count: number
  last_blocked_at: string | null
  created_at: string
  active: boolean
}

export function getSecuritySummary() {
  return request<{ unseen: number }>('GET', '/admin/security/summary')
}

export function getSecurityEvents(filters: SecurityEventFilters) {
  return request<Page<SecurityEvent>>('GET', `/admin/security/events${query(filters)}`)
}

export function markSecurityEventSeen(id: string) {
  return request<{ id: string; seen_at: string }>('POST', `/admin/security/events/${id}/seen`)
}

export function markAllSecurityEventsSeen() {
  return request<{ updated: number }>('POST', '/admin/security/events/seen')
}

export function getBannedIps(page?: string) {
  return request<Page<BannedIp>>('GET', `/admin/security/bans${query({ page })}`)
}

export function banIp(ip: string, duration: BanDuration, note: string) {
  return request<BannedIp>('POST', '/admin/security/bans', { ip, duration, note: note || null })
}

export function unbanIp(id: string) {
  return request<null>('DELETE', `/admin/security/bans/${id}`)
}

// Bug reports (backend README "Bug reports"). The report itself is multipart: JSON parts as text,
// the screenshot as a file. The included flags say which optional parts the user kept.
export type BugReportIncluded = { account: boolean; diagnostics: boolean; screenshot: boolean; problem: boolean }
export type BugReportErrorContext = { status?: number; path?: string; code?: string; message?: string }
export type BugReportProblem = {
  slug: string | null
  language: string
  code: string
  result?: { status: string; passed_count: number; total_count: number; message?: string }
}
export type BugReportStatus = 'new' | 'in_progress' | 'fixed' | 'wont_fix'
export const BUG_REPORT_STATUSES: BugReportStatus[] = ['new', 'in_progress', 'fixed', 'wont_fix']

export function sendBugReport(form: FormData) {
  return request<{ id: string }>('POST', '/bug-reports', form)
}

export type BugReportRow = {
  id: string
  user_id: string | null
  contact_email: string | null
  description: string
  status: BugReportStatus
  page_path: string
  seen_at: string | null
  created_at: string
  has_screenshot: boolean
  user: { id: string; name: string; email: string; role: Role } | null
}
export type BugReport = BugReportRow & {
  admin_note: string | null
  page_title: string | null
  app_version: string | null
  language: string | null
  theme: string | null
  user_agent: string | null
  viewport: string | null
  timezone: string | null
  error_context: BugReportErrorContext | null
  failed_requests: { method?: string; path?: string; status?: number; time?: string; code?: string; message?: string }[] | null
  console_errors: { message?: string; time?: string }[] | null
  problem_context: Partial<BugReportProblem> | null
  included: Partial<BugReportIncluded>
  status_changed_at: string | null
  handled_by: string | null
  handler: { id: string; name: string; email: string } | null
  updated_at: string
}
export type BugReportFilters = { status?: string; seen?: string; search?: string; screenshot?: string; page?: string }

export function getBugReportSummary() {
  return request<{ unseen: number }>('GET', '/admin/bug-reports/summary')
}

export function getBugReports(filters: BugReportFilters) {
  return request<Page<BugReportRow>>('GET', `/admin/bug-reports${query(filters)}`)
}

export function getBugReport(id: string) {
  return request<BugReport>('GET', `/admin/bug-reports/${id}`)
}

export function updateBugReport(id: string, changes: { status?: BugReportStatus; admin_note?: string | null }) {
  return request<BugReport>('PATCH', `/admin/bug-reports/${id}`, changes)
}

export function deleteBugReport(id: string) {
  return request<null>('DELETE', `/admin/bug-reports/${id}`)
}

// The screenshot through the owner's session, as a blob for an object URL (never a public URL).
export async function getBugReportScreenshot(id: string): Promise<Blob> {
  const t = i18n.getFixedT('en')
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/admin/bug-reports/${id}/screenshot`, { credentials: 'include', headers: { Accept: 'image/*', 'Accept-Language': 'en' } })
  } catch {
    throw new ApiError(0, t('errors.network'))
  }
  if (!response.ok) throw new ApiError(response.status, t('errors.status', { status: response.status }))
  return response.blob()
}
