import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: ButtonVariant
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-[#ffe05c]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-[#321fb0]',
  ghost: 'bg-card text-foreground hover:bg-muted',
  danger: 'bg-danger text-white hover:bg-red-700',
}

export function Button({ asChild, className, variant = 'primary', ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      className={cn(
        'neo-button inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-sm font-black disabled:pointer-events-none disabled:opacity-50 active:neo-button-active',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
