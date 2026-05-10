import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? <p className="text-xs font-black uppercase text-secondary">{eyebrow}</p> : null}
        <h1 className="text-3xl font-black md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  )
}
