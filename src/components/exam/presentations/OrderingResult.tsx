export interface OrderingResultItem {
  id: string
  text: string
  correctPosition: number
}

interface OrderingResultProps {
  items: OrderingResultItem[]
  learnerOrder: string[]
}

export function OrderingResult({ items, learnerOrder }: OrderingResultProps) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const visibleOrder = [...learnerOrder.filter((id) => byId.has(id)), ...items.map((item) => item.id).filter((id) => !learnerOrder.includes(id))]
  const correctOrder = [...items].sort((a, b) => a.correctPosition - b.correctPosition)

  return <section className="space-y-4" aria-label="Kết quả sắp xếp">
    <div className="border-2 border-border bg-muted/30 p-3 text-sm font-semibold">Thứ tự bạn đã nộp được đối chiếu theo từng vị trí.</div>
    <ol className="space-y-2">
      {visibleOrder.map((id, index) => {
        const item = byId.get(id)
        if (!item) return null
        const isCorrect = item.correctPosition === index + 1
        return <li key={id} className={`flex items-center gap-3 border-2 p-3 font-black ${isCorrect ? 'border-secondary bg-secondary/15 text-secondary' : 'border-danger bg-danger text-white'}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-current text-xs">{index + 1}</span>{item.text}
        </li>
      })}
    </ol>
    <div className="border-2 border-black bg-yellow-300 p-3 text-sm font-black text-black shadow-[2px_2px_0_#000]">
      <span className="mr-2">Thứ tự đúng</span>{correctOrder.map((item) => item.text).join(' → ')}
    </div>
  </section>
}
