import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '@/lib/utils'

// shadcn/ui progress (Base UI, role="progressbar"), in the look of the landing progress bars: a
// 6 px line track with an accent fill. Give it aria-label or a ProgressLabel, and getAriaValueText
// for a translated value.
function Progress({ className, children, value, ...props }: ProgressPrimitive.Root.Props) {
  const min = props.min ?? 0
  const max = props.max ?? 100
  const fraction = value == null || max <= min ? null : Math.min(1, Math.max(0, (value - min) / (max - min)))
  return (
    <ProgressPrimitive.Root value={value} data-slot="progress" className={cn('flex flex-wrap gap-3', className)} {...props}>
      {children}
      <ProgressTrack>
        <ProgressIndicator style={fraction === null ? undefined : { width: '100%', transform: `scaleX(${fraction})` }} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn('relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-line', className)}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn('h-full origin-left rounded-full bg-accent motion-safe:transition-transform motion-safe:duration-(--dur-state) motion-safe:ease-out rtl:origin-right', className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return <ProgressPrimitive.Label className={cn('text-sm font-medium', className)} data-slot="progress-label" {...props} />
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn('ms-auto text-sm text-muted tabular-nums', className)}
      data-slot="progress-value"
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue }
