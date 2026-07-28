import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export interface OrderingEditorValue { items: Array<{ id: string; text: string; correctPosition: number }> }

interface OrderingEditorProps { value: OrderingEditorValue; onChange: (value: OrderingEditorValue) => void; disabled?: boolean }

function makeId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` }

export function OrderingEditor({ value, onChange, disabled = false }: OrderingEditorProps) {
  const add = () => onChange({ items: [...value.items, { id: makeId(), text: '', correctPosition: value.items.length + 1 }] })
  const update = (id: string, text: string) => onChange({ items: value.items.map((item) => item.id === id ? { ...item, text } : item) })
  const remove = (id: string) => onChange({ items: value.items.filter((item) => item.id !== id).map((item, index) => ({ ...item, correctPosition: index + 1 })) })

  return <section className="space-y-4" aria-label="Trình soạn sắp xếp">
    <div><h3 className="text-lg font-black">Sắp xếp thứ tự</h3><p className="mt-1 text-sm font-semibold text-muted-foreground">Nhập các mục theo thứ tự đúng. Học viên sẽ thay đổi vị trí bằng các nút lên/xuống.</p></div>
    {value.items.map((item, index) => <article key={item.id} className="neo-card grid gap-3 bg-card p-4 shadow-[2px_2px_0_var(--border)] md:grid-cols-[auto_1fr_auto] md:items-end">
      <div className="border-2 border-border bg-primary px-3 py-2 text-sm font-black text-black">{index + 1}</div>
      <div className="space-y-1"><Label htmlFor={`ordering-${item.id}`}>Nội dung ở vị trí {index + 1}</Label><Input id={`ordering-${item.id}`} value={item.text} disabled={disabled} onChange={(event) => update(item.id, event.target.value)} /></div>
      <Button type="button" variant="danger" aria-label={`Xóa mục ${index + 1}`} disabled={disabled} onClick={() => remove(item.id)} className="px-3"><Trash2 size={16} /></Button>
    </article>)}
    <Button type="button" variant="secondary" disabled={disabled} onClick={add}><Plus size={16} /> Thêm mục</Button>
  </section>
}
