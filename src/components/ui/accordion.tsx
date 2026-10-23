import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// shadcn/ui accordion (Base UI), mapped to our tokens. Not used yet: the FAQ stays on native
// <details>, which works without JavaScript and is prerendered.
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn('border-line not-last:border-b', className)} {...props} />
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex min-h-11 flex-1 items-center justify-between gap-4 rounded py-2.5 text-start font-medium hover:text-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          aria-hidden="true"
          data-slot="accordion-trigger-icon"
          className="pointer-events-none size-4 shrink-0 text-muted group-aria-expanded/accordion-trigger:rotate-180 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-calm"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

// Opens and closes in height (Base UI's --accordion-panel-height), only with motion allowed.
function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden data-ending-style:h-0 data-starting-style:h-0 motion-safe:transition-[height] motion-safe:duration-200 motion-safe:ease-calm"
      {...props}
    >
      <div className={cn('pb-3 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_p:not(:last-child)]:mb-4', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
