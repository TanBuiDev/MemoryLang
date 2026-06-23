import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border-2 border-border bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground shadow-[2px_2px_0_var(--border)] whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}
