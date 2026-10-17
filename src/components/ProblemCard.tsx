import { useTranslation } from 'react-i18next'
import type { Problem } from '../api'
import Content from './Content'
import ProblemSolver from './ProblemSolver'

export default function ProblemCard({ problem }: { problem: Problem }) {
  const { t } = useTranslation()
  return (
    <article className="mt-10 border-t border-line pt-8" aria-labelledby={`problem-${problem.id}`}>
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
