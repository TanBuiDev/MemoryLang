import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { adminExamService } from '@/services/supabase/adminExam.service'
import type { B1ExamCloneSource } from '@/types/exam.types'

interface B1SourceExamPickerProps {
  selectedSourceId: string | null
  onSelect: (sourceId: string) => void
  disabled?: boolean
}

const SEARCH_DEBOUNCE_MS = 250

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'không rõ ngày' : new Intl.DateTimeFormat('vi-VN').format(date)
}

export function B1SourceExamPicker({ selectedSourceId, onSelect, disabled = false }: B1SourceExamPickerProps) {
  const [search, setSearch] = useState('')
  const [sources, setSources] = useState<B1ExamCloneSource[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setStatus('loading')
      setError(null)
      void adminExamService.listB1CloneSources(search).then((items) => {
        if (!active) return
        setSources(items)
        setStatus('success')
      }).catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách đề B1.')
        setStatus('error')
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [search])

  const selectedSource = sources.find((source) => source.id === selectedSourceId)

  return (
    <section aria-labelledby="b1-source-picker-title" className="flex flex-col gap-3">
      <div>
        <h3 id="b1-source-picker-title" className="text-base font-black">Chọn đề B1 nguồn</h3>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Tìm theo tên để chọn đề dùng làm điểm bắt đầu.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="b1-source-search">Tìm đề B1 nguồn</Label>
        <Input
          id="b1-source-search"
          type="search"
          value={search}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nhập tên đề B1..."
        />
      </div>

      {status === 'loading' ? <p role="status" className="text-sm font-bold text-muted-foreground">Đang tìm đề B1...</p> : null}
      {status === 'error' && error ? <p role="alert" className="border-2 border-danger bg-red-50 p-3 text-sm font-bold text-danger">{error}</p> : null}
      {status === 'success' && sources.length === 0 ? <p className="border-2 border-dashed border-border p-3 text-sm font-bold text-muted-foreground">Không tìm thấy đề B1 phù hợp.</p> : null}

      {selectedSource ? <p className="border-2 border-secondary bg-secondary/10 p-3 text-sm font-black">Đã chọn đề nguồn: {selectedSource.title}</p> : null}

      {sources.length > 0 ? (
        <div aria-live="polite" className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          {sources.map((source) => {
            const selected = source.id === selectedSourceId
            return (
              <Button
                key={source.id}
                type="button"
                variant={selected ? 'secondary' : 'ghost'}
                disabled={disabled}
                onClick={() => onSelect(source.id)}
                className="h-auto justify-start whitespace-normal p-3 text-left"
              >
                <span className="flex w-full flex-col gap-1">
                  <span className="text-sm font-black">{source.title}</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {source.is_published ? 'Đã xuất bản' : 'Bản nháp'} · {source.section_count} phần · Cập nhật {formatUpdatedAt(source.updated_at)}
                  </span>
                </span>
              </Button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
