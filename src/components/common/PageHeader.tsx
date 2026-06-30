import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {eyebrow ? <p className="text-xs font-black uppercase text-secondary mb-1">{eyebrow}</p> : null}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black md:text-4xl">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 items-center">{actions}</div>}
      </div>
      {description ? (
        <div className="max-w-3xl text-sm font-semibold text-muted-foreground">{description}</div>
      ) : null}
    </div>
  )
}
