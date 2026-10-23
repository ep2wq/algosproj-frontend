import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/utils'

// shadcn/ui input (Base UI), in the look of Field.tsx: field border, muted on hover, fail when
// aria-invalid. Not used yet.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'block w-full min-w-0 rounded border border-field bg-surface px-3 py-2 text-ink hover:border-muted disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-fail aria-invalid:hover:border-fail file:me-3 file:border-0 file:bg-transparent file:font-medium file:text-ink',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
