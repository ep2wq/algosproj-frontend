import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

// shadcn/ui tabs (Base UI) in our underline style, horizontal only (docs/ui-shadcn.md outside this
// repo). Arrow keys follow the DirectionProvider in Layout, so in Arabic the left arrow goes to the
// next tab. Pass activateOnFocus to TabsList for automatic activation.
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />
}

// The row scrolls sideways inside itself if the labels do not fit (smaller labels below sm, so three
// fit at 320 px).
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        '-mb-px inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap sm:px-4 sm:text-base',
        'aria-selected:border-accent aria-selected:text-ink aria-[selected=false]:border-transparent aria-[selected=false]:text-muted aria-[selected=false]:hover:border-line aria-[selected=false]:hover:text-accent',
        'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn('flex-1', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
