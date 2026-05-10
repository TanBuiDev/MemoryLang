import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface StatTileProps {
  label: string
  value: ReactNode
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <Card>
      <p className="text-sm font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </Card>
  )
}
