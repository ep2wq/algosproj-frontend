import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// shadcn/ui checkbox (Base UI), mapped to our tokens: field border (3:1), accent when checked.
// Base UI renders a span with role="checkbox" plus a hidden input. Not used yet.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-sm border border-field bg-surface after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-muted disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-fail data-checked:border-accent data-checked:bg-accent data-checked:text-inverse',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center text-current [&>svg]:size-3.5">
        <CheckIcon aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
