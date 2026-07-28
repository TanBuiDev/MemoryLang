import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface OrderingAttemptItem {
  id: string
  text: string
}

interface OrderingAttemptProps {
  items: OrderingAttemptItem[]
  order: string[]
  onChange: (order: string[]) => void
  disabled?: boolean
}

export function OrderingAttempt({ items, order, onChange, disabled = false }: OrderingAttemptProps) {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const normalizedOrder = [...order.filter((id) => itemById.has(id)), ...items.map((item) => item.id).filter((id) => !order.includes(id))]
  const move = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= normalizedOrder.length) return
    const nextOrder = [...normalizedOrder]
    ;[nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]]
    onChange(nextOrder)
  }

  return <section className="space-y-4" aria-label="Sắp xếp thứ tự">
    <div className="border-2 border-border bg-muted/30 p-3 text-sm font-semibold">
      Dùng mũi tên để sắp xếp các mục theo thứ tự đúng.
    </div>
    <ol className="space-y-3">
      {normalizedOrder.map((id, index) => {
        const item = itemById.get(id)
        if (!item) return null
        return <li key={id} className="neo-card flex items-center gap-3 border-2 border-border bg-card p-3 shadow-[2px_2px_0_var(--border)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-primary text-sm font-black text-black">{index + 1}</span>
          <p className="min-w-0 flex-1 font-black">{item.text}</p>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" aria-label={`Đưa ${item.text} lên`} disabled={disabled || index === 0} onClick={() => move(index, -1)} className="min-h-8 min-w-8 px-2"><ArrowUp size={16} /></Button>
            <Button type="button" variant="ghost" aria-label={`Đưa ${item.text} xuống`} disabled={disabled || index === normalizedOrder.length - 1} onClick={() => move(index, 1)} className="min-h-8 min-w-8 px-2"><ArrowDown size={16} /></Button>
          </div>
        </li>
      })}
    </ol>
  </section>
}
