import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn/ui button (Base UI), mapped to our states (docs/ui-restyle.md outside this repo): default
// = primaryButton, outline = secondaryButton in buttonStyles.ts. Hover colours, the 1 px press and
// the focus outline come from src/index.css, only with motion allowed. Not used yet.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-transparent bg-clip-padding font-medium whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-invalid:border-fail [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border-field bg-surface text-ink hover:border-muted',
        secondary: 'border-line bg-paper text-ink hover:border-muted',
        ghost: 'text-ink hover:bg-accent-soft',
        destructive: 'bg-fail/10 text-fail hover:bg-fail/20',
        link: 'text-accent underline-offset-2 hover:underline',
      },
      size: {
        default: 'min-h-11 px-5',
        sm: 'min-h-11 px-3 text-sm sm:pointer-fine:min-h-9',
        icon: 'size-11',
        'icon-sm': 'size-11 sm:pointer-fine:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant = 'default', size = 'default', ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }
