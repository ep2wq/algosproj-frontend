import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

// shadcn/ui tabs (Base UI) in our underline style, horizontal only (docs/ui-shadcn.md outside this
// repo). Arrow keys follow the DirectionProvider in Layout, so in Arabic the left arrow goes to the
// next tab. Pass activateOnFocus to TabsList for automatic activation.
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col', className)} {...props} />
}

// The row scrolls sideways inside itself only if the labels do not fit (smaller labels below sm, so
// three fit at 320 px), with no scrollbar: pair it with useScrollCue and scroll-fade for the cue.
// overflow-x-auto alone would make the row scroll vertically too (a small scrollbar with arrows at its
// end), so the vertical direction is hidden and the selected bar sits inside the row, on its line.
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // The row clips anything outside it, so the focus outline is drawn inside the tab.
        'inline-flex min-h-11 shrink-0 focus-visible:outline-offset-[-2px]! items-center justify-center gap-1.5 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap sm:px-4 sm:text-base',
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
