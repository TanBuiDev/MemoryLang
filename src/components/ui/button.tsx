import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

export const buttonVariants = cva(
  'neo-button inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-sm font-black disabled:pointer-events-none disabled:opacity-50 active:neo-button-active transition-all',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-[#ffe05c]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[#321fb0]',
        ghost: 'bg-card text-foreground hover:bg-muted',
        danger: 'bg-danger text-white hover:bg-red-700',
        default: 'bg-primary text-primary-foreground hover:bg-[#ffe05c]',
        destructive: 'bg-danger text-white hover:bg-red-700',
        outline: 'border-2 border-border bg-background shadow-[2px_2px_0_var(--border)] hover:bg-muted',
      },
      size: {
        default: '',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, className, variant, size, ...props }, ref) => {
    const Component = asChild ? Slot : 'button'

    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
