import type { ChallengeSummary, LessonSummary, Module } from './api'

// A lesson is done when it has at least one problem and every one of them is solved: the same
// rule as the check mark on the lessons list. solved is only ever true for the logged-in user.
export function lessonsDone(challenges: ChallengeSummary[]): Set<string> {
  const allSolved = new Map<string, boolean>()
  for (const challenge of challenges) {
    if (!challenge.lesson_slug) continue
    allSolved.set(challenge.lesson_slug, (allSolved.get(challenge.lesson_slug) ?? true) && challenge.solved)
  }
  return new Set([...allSolved].filter(([, solved]) => solved).map(([slug]) => slug))
}

// The first lesson, in course order, that is not done; null when every lesson is.
export function nextLesson(modules: Module[], done: Set<string>): { module: Module; lesson: LessonSummary } | null {
  for (const module of modules) {
    const lesson = module.lessons.find((item) => !done.has(item.slug))
    if (lesson) return { module, lesson }
  }
  return null
}

// The tracks in display order, taken from the modules themselves: the known ones first, then any
// other track in the order its first module comes. Each keeps its modules in course order.
const KNOWN_TRACKS = ['basics', 'data-structures', 'algorithms']

export function groupByTrack(modules: Module[]): [string, Module[]][] {
  const groups = new Map<string, Module[]>()
  for (const module of modules) groups.set(module.track, [...(groups.get(module.track) ?? []), module])
  const rank = (track: string) => (KNOWN_TRACKS.includes(track) ? KNOWN_TRACKS.indexOf(track) : KNOWN_TRACKS.length)
  return [...groups].sort(([a], [b]) => rank(a) - rank(b))
}

// The name shown until home.tracks.<id> has a translation: "data-structures" -> "Data structures".
export function trackName(track: string): string {
  const words = track.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
