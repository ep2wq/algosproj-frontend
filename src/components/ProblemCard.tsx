import { useTranslation } from 'react-i18next'
import type { Problem } from '../api'
import Content from './Content'
import ProblemSolver from './ProblemSolver'

// id makes the card a skip-link target (LessonPage): focusable from script, scrolled to with a little
// room above it, and its focus outline drawn 8 px out so it clears the text (! because the global
// :focus-visible rule in index.css is outside the layers and would win).
export default function ProblemCard({ problem, id }: { problem: Problem; id?: string }) {
  const { t } = useTranslation()
  return (
    <article
      id={id}
      tabIndex={id ? -1 : undefined}
      className="mt-10 scroll-mt-4 border-t border-line pt-8 focus-visible:outline-offset-8!"
      aria-labelledby={`problem-${problem.id}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`problem-${problem.id}`} className="text-xl font-semibold">
          <Content lang="auto">{problem.title}</Content>
        </h2>
        <span className="text-sm text-muted">{t(`difficulty.${problem.difficulty}`, { defaultValue: problem.difficulty })}</span>
        <span className="text-sm text-muted tabular-nums">{t('common.points', { count: problem.points })}</span>
      </div>
      <ProblemSolver problem={problem} />
    </article>
  )
}
