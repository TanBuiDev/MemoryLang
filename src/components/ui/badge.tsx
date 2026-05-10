import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border-2 border-border bg-primary px-2 py-0.5 text-xs font-black text-primary-foreground',
        className,
      )}
      {...props}
    />
  )
}
