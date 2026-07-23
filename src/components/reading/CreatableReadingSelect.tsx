import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'

interface CreatableReadingSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  onCreate: (name: string) => Promise<SelectOption>
}

export function CreatableReadingSelect({
  value,
  options,
  onChange,
  onCreate,
}: CreatableReadingSelectProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleCreate = async () => {
    setSaving(true)
    setMessage('')
    try {
      const option = await onCreate(newName)
      onChange(option.value)
      setMessage(`Đã thêm “${option.label}”`)
      setNewName('')
      setAdding(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể thêm tùy chọn.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Select value={value} onChange={onChange} options={options} />
        <Button
          type="button"
          variant="secondary"
          aria-label="Thêm tùy chọn mới"
          title="Thêm tùy chọn mới"
          onClick={() => setAdding((current) => !current)}
          className="h-10 w-10 shrink-0 px-0"
        >
          {adding ? <X size={16} /> : <Plus size={16} />}
        </Button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl border-2 border-slate-900 bg-amber-50 p-3 shadow-[2px_2px_0px_0px_#000]">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Tên tùy chọn mới"
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            className="w-full"
          >
            {saving ? 'Đang lưu...' : 'Lưu tùy chọn'}
          </Button>
        </div>
      )}

      {message && <p className="text-[11px] font-bold text-slate-600">{message}</p>}
    </div>
  )
}
