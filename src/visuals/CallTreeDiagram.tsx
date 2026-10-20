import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TextWithCode } from '../components/LessonBody'
import { CALL_BOX_H, CALL_BOX_W, callTreeLayout, callTreeSize, type CallNode } from './callTree'
import { useScrollCue } from './useScrollCue'

// How a call is drawn: the call running now, an open call waiting for it (on the call stack),
// a base case that printed, or a call that has returned.
export type CallMark = 'running' | 'open' | 'printed' | 'returned'

const BOX_CLASS: Record<CallMark, string> = {
  running: 'fill-surface stroke-warn',
  open: 'fill-accent-soft stroke-accent',
  printed: 'fill-pass stroke-pass',
  returned: 'fill-surface stroke-field',
}

const TEXT_CLASS: Record<CallMark, string> = {
  running: 'fill-ink',
  open: 'fill-ink',
  printed: 'fill-surface',
  returned: 'fill-muted',
}

// The calls made so far (nodes[0..shown)), drawn as a tree that grows step by step. The whole
// tree's size is used from the start, so the drawing doesn't jump while it grows; it scrolls
// sideways inside its own box, and follows the running call. The drawing is left to right in both
// languages (also what scrollLeft assumes).
export default function CallTreeDiagram({ nodes, shown, markOf, label }: { nodes: CallNode[]; shown: number; markOf: (id: number) => CallMark; label: string }) {
  const { t } = useTranslation('visuals')
  // One ref: the scroll cue and the follow-the-running-call scrolling share the box.
  const [boxRef, scrollMore] = useScrollCue<HTMLDivElement>()
  const { width, height } = callTreeSize(nodes)
  const points = callTreeLayout(nodes)
  const visible = nodes.slice(0, shown)
  const running = visible.find((node) => markOf(node.id) === 'running')
  const runningX = running === undefined ? null : points.get(running.id)!.x

  useEffect(() => {
    const box = boxRef.current
    if (box === null || runningX === null) return
    if (runningX < box.scrollLeft + CALL_BOX_W || runningX > box.scrollLeft + box.clientWidth - CALL_BOX_W) {
      box.scrollLeft = runningX - box.clientWidth / 2
    }
  }, [boxRef, runningX])

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="region"
      aria-label={t('callTree.region')}
      dir="ltr"
      className={`mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-2${scrollMore ? ' scroll-fade' : ''}`}
    >
      <div role="img" aria-label={label} className="w-max">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden="true">
          {visible.map((node) => {
            if (node.parent === null) return null
            const a = points.get(node.parent)!
            const b = points.get(node.id)!
            const onStack = markOf(node.id) === 'running' || markOf(node.id) === 'open'
            return (
              <line
                key={`edge-${node.id}`}
                x1={a.x}
                y1={a.y + CALL_BOX_H / 2}
                x2={b.x}
                y2={b.y - CALL_BOX_H / 2}
                strokeWidth={onStack ? 2.5 : 1.5}
                className={onStack ? 'stroke-accent' : 'stroke-field'}
              />
            )
          })}
          {visible.map((node) => {
            const { x, y } = points.get(node.id)!
            const mark = markOf(node.id)
            return (
              <g key={node.id}>
                <rect
                  x={x - CALL_BOX_W / 2}
                  y={y - CALL_BOX_H / 2}
                  width={CALL_BOX_W}
                  height={CALL_BOX_H}
                  rx={4}
                  strokeWidth={mark === 'running' ? 3 : 1.5}
                  className={`${BOX_CLASS[mark]} motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-calm`}
                />
                <text x={x} y={y + 4} textAnchor="middle" className={`font-mono text-xs font-semibold ${TEXT_CLASS[mark]}`}>
                  {node.label}
                </text>
                {(mark === 'running' || mark === 'printed') && (
                  <text x={x} y={y + CALL_BOX_H / 2 + 13} textAnchor="middle" className={`text-xs font-semibold ${mark === 'running' ? 'fill-warn' : 'fill-pass'}`}>
                    {mark === 'running' ? '▲' : '✓'}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// The legend for the call tree. Each state has a symbol or a fill, and a label.
export function CallTreeLegend() {
  const { t } = useTranslation('visuals')
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded-sm border-2 border-warn bg-surface" aria-hidden="true" />
        <span aria-hidden="true" className="font-semibold text-warn">
          ▲
        </span>
        {t('callTree.running')}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded-sm border border-accent bg-accent-soft" aria-hidden="true" />
        <TextWithCode text={t('callTree.waiting')} />
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded-sm border border-pass bg-pass" aria-hidden="true" />
        <span aria-hidden="true" className="font-semibold text-pass">
          ✓
        </span>
        <TextWithCode text={t('callTree.printed')} />
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded-sm border border-field bg-surface" aria-hidden="true" />
        {t('callTree.returned')}
      </li>
    </ul>
  )
}
