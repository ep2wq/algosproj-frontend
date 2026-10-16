// The difficulty as a word with a color, so it never depends on color alone.
const STYLES: Record<string, string> = {
  easy: 'bg-pass/10 text-pass border-pass/30',
  medium: 'bg-warn/10 text-warn border-warn/30',
  hard: 'bg-fail/10 text-fail border-fail/30',
}

export default function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium capitalize ${STYLES[difficulty] ?? 'border-line text-muted'}`}
    >
      {difficulty}
    </span>
  )
}
