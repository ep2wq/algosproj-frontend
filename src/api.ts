const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const TOKEN_KEY = 'token'

export type User = {
  id: number
  name: string
  email: string
  points: number
  // Only for showing the Admin link; the backend checks the role on every admin request.
  role: 'user' | 'admin'
}

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

export type Problem = {
  id: number
  title: string
  description: string
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
export type AdminLesson = {
  id: number
  module_id: number
  slug: string
  title: string
  body: string | null
  sort_order: number
}

export type AdminProblem = {
  id: number
  lesson_id: number | null
  slug: string | null
  title: string
  description: string
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

// sort_order is sent as typed; the backend validates it as an integer.
export type ModuleInput = { title: string; slug: string; sort_order: string }
export type LessonInput = { module_id: number | null; title: string; slug: string; body: string; sort_order: string }
export type ProblemInput = { lesson_id: number | null; title: string; slug: string; description: string; difficulty: string }
export type TestCaseInput = { input: string; expected_output: string; is_hidden: boolean }

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// The auth provider sets this, so a 401 on an authenticated request logs the user out.
let onUnauthorized: () => void = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server")
  }

  const data = await response.json().catch(() => null)

  if (response.ok) return data as T

  const serverMessage = typeof data?.message === 'string' ? data.message : ''

  if (response.status === 401 && token) {
    setToken(null)
    onUnauthorized()
    throw new ApiError(401, 'Your session has ended. Log in again.')
  }
  if (response.status === 422) {
    throw new ApiError(422, serverMessage || 'Check the highlighted fields.', data?.errors ?? {})
  }
  if (response.status === 429) {
    throw new ApiError(429, 'Too many requests, wait a minute')
  }
  if (response.status === 503) {
    throw new ApiError(503, serverMessage || 'The service is unavailable, try again shortly')
  }
  throw new ApiError(response.status, serverMessage || `Request failed (${response.status})`)
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
  return request<Module[]>('GET', '/admin/modules')
}

export function createModule(data: ModuleInput) {
  return request<Module>('POST', '/admin/modules', data)
}

export function updateModule(id: number, data: ModuleInput) {
  return request<Module>('PUT', `/admin/modules/${id}`, data)
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
  return request<Omit<AdminProblem, 'description'>[]>('GET', '/admin/problems')
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
