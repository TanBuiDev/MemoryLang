import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export interface MatchingEditorItem { id: string; text: string }
export interface MatchingEditorValue { leftItems: MatchingEditorItem[]; rightItems: MatchingEditorItem[]; pairs: Array<{ leftId: string; rightId: string }> }

interface MatchingEditorProps { value: MatchingEditorValue; onChange: (value: MatchingEditorValue) => void; disabled?: boolean }

function makeId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}` }

export function MatchingEditor({ value, onChange, disabled = false }: MatchingEditorProps) {
  const addPair = () => {
    const leftId = makeId(); const rightId = makeId()
    onChange({ ...value, leftItems: [...value.leftItems, { id: leftId, text: '' }], rightItems: [...value.rightItems, { id: rightId, text: '' }], pairs: [...value.pairs, { leftId, rightId }] })
  }
  const update = (side: 'leftItems' | 'rightItems', id: string, text: string) => onChange({ ...value, [side]: value[side].map((item) => item.id === id ? { ...item, text } : item) })
  const remove = (leftId: string, rightId: string) => onChange({ ...value, leftItems: value.leftItems.filter((item) => item.id !== leftId), rightItems: value.rightItems.filter((item) => item.id !== rightId), pairs: value.pairs.filter((pair) => pair.leftId !== leftId) })
  return <section className="space-y-4" aria-label="Trình soạn ghép cặp">
    <div><h3 className="text-lg font-black">Ghép cặp</h3><p className="mt-1 text-sm font-semibold text-muted-foreground">Nhập từng cặp tương ứng. Học viên sẽ ghép hai cột; đáp án được lưu an toàn.</p></div>
    {value.pairs.map((pair, index) => {
      const left = value.leftItems.find((item) => item.id === pair.leftId); const right = value.rightItems.find((item) => item.id === pair.rightId)
      if (!left || !right) return null
      return <article key={pair.leftId} className="neo-card grid gap-3 bg-card p-4 shadow-[2px_2px_0_var(--border)] md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1"><Label htmlFor={`matching-left-${left.id}`}>Mục bên trái {index + 1}</Label><Input id={`matching-left-${left.id}`} value={left.text} disabled={disabled} onChange={(event) => update('leftItems', left.id, event.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor={`matching-right-${right.id}`}>Mục bên phải {index + 1}</Label><Input id={`matching-right-${right.id}`} value={right.text} disabled={disabled} onChange={(event) => update('rightItems', right.id, event.target.value)} /></div>
        <Button type="button" variant="danger" aria-label={`Xóa cặp ${index + 1}`} disabled={disabled} onClick={() => remove(left.id, right.id)} className="self-end px-3"><Trash2 size={16} /></Button>
      </article>
    })}
    <Button type="button" variant="secondary" disabled={disabled} onClick={addPair}><Plus size={16} /> Thêm cặp ghép</Button>
  </section>
}
