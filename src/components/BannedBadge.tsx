// "Banned" as a word, so it never depends on color alone.
export default function BannedBadge() {
  return (
    <span className="inline-block rounded border border-fail/30 bg-fail/10 px-1.5 py-0.5 text-xs font-medium text-fail">
      Banned
    </span>
  )
}
