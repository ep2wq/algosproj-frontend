import type { Problem } from '../api'
import Content from './Content'
import ProblemSolver from './ProblemSolver'

export default function ProblemCard({ problem }: { problem: Problem }) {
  return (
    <article className="mt-10 border-t border-line pt-8" aria-labelledby={`problem-${problem.id}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`problem-${problem.id}`} className="text-xl font-semibold">
          <Content lang="en">{problem.title}</Content>
        </h2>
        <span className="text-sm capitalize text-muted">{problem.difficulty}</span>
        <span className="text-sm text-muted tabular-nums">{problem.points} points</span>
      </div>
      <ProblemSolver problem={problem} />
    </article>
  )
}
