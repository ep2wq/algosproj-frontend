import { cn } from '@/lib/utils'

// A loading placeholder (shadcn/ui), mapped to our tokens. Static on purpose: nothing loops
// (docs/ui-restyle.md outside this repo). Give it aria-hidden; say "Loading" in text nearby.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('rounded bg-line', className)} {...props} />
}

export { Skeleton }
