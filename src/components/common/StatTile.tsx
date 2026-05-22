import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface StatTileProps {
  label: string
  value: ReactNode
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 h-4 w-16 border-b-2 border-l-2 border-border bg-primary" />
      <p className="text-sm font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </Card>
  )
}
