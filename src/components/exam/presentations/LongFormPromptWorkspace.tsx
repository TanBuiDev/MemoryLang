import { FileEdit, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { PracticeDraftVersion } from '@/types/exam.types'

interface LongFormPromptWorkspaceProps {
  draftContent: string
  onDraftChange: (content: string) => void
  onSaveVersion: () => void
  isSaving: boolean
  disabled: boolean
  drafts: PracticeDraftVersion[]
  isLoadingDrafts: boolean
  leftVersionId: string
  rightVersionId: string
  onLeftVersionChange: (id: string) => void
  onRightVersionChange: (id: string) => void
}

export function LongFormPromptWorkspace({
  draftContent, onDraftChange, onSaveVersion, isSaving, disabled, drafts, isLoadingDrafts,
  leftVersionId, rightVersionId, onLeftVersionChange, onRightVersionChange,
}: LongFormPromptWorkspaceProps) {
  const options = drafts.map((draft) => ({ value: draft.id, label: `Phiên bản ${draft.version_number} · ${draft.word_count} từ` }))
  const selectedVersions = [
    drafts.find((draft) => draft.id === leftVersionId),
    drafts.find((draft) => draft.id === rightVersionId),
  ]
  const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/u).length : 0

  return <div className="space-y-6">
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="practice-draft" className="font-black text-sm">Bản nháp bài làm của bạn</Label>
        <span className="border border-border bg-muted px-2 py-0.5 text-xs font-black text-secondary">{wordCount} từ</span>
      </div>
      <Textarea id="practice-draft" value={draftContent} disabled={disabled} onChange={(event) => onDraftChange(event.target.value)} placeholder="Nhập nội dung bài viết của bạn ở đây..." className="mt-1 min-h-72 p-4 text-base font-semibold leading-relaxed border-2 border-border focus:ring-2 focus:ring-secondary" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">Tự động lưu sau khi dừng thao tác gõ.</span>
        <Button onClick={onSaveVersion} disabled={disabled || !draftContent.trim() || isSaving} variant="primary" className="font-black"><Save size={16} />Lưu thành phiên bản</Button>
      </div>
    </div>

    <section className="space-y-4 border-t-2 border-border pt-5">
      <div><h3 className="flex items-center gap-2 text-lg font-black"><FileEdit size={18} className="text-secondary" />So sánh các phiên bản bản nháp</h3><p className="mt-0.5 text-xs font-semibold text-muted-foreground">Chọn hai phiên bản bạn đã lưu để đối chiếu song song.</p></div>
      {isLoadingDrafts ? <p className="animate-pulse text-sm font-bold text-muted-foreground">Đang tải phiên bản...</p>
        : drafts.length === 0 ? <p className="border border-border bg-muted p-3 text-xs font-bold text-muted-foreground">Chưa có phiên bản nào được lưu. Hãy bấm “Lưu thành phiên bản” ở trên.</p>
          : <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Select value={leftVersionId} onChange={onLeftVersionChange} options={options} placeholder="Chọn bản bên trái" /><Select value={rightVersionId} onChange={onRightVersionChange} options={options} placeholder="Chọn bản bên phải" /></div><div className="grid gap-4 md:grid-cols-2">{selectedVersions.map((version, index) => <article key={index} className="min-h-40 space-y-2 border-2 border-border bg-muted/60 p-4"><p className="border-b border-border pb-1 text-xs font-black uppercase text-secondary">{version ? `Phiên bản ${version.version_number} (${version.word_count} từ)` : 'Chưa chọn phiên bản'}</p><p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-foreground">{version?.content ?? '—'}</p></article>)}</div></div>}
    </section>
  </div>
}
