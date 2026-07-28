import { PenTool } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PracticePromptSample } from '@/types/exam.types'
import { compareWritingContent, type WritingComparisonToken } from '@/utils/writingComparison'

function WritingTokens({ tokens, missing }: { tokens: WritingComparisonToken[]; missing: boolean }) {
  return <p className="text-sm font-semibold leading-relaxed text-foreground">
    {tokens.map((token, index) => (
      <span key={`${token.value}-${index}`} className={token.status === 'same' ? '' : missing ? 'mx-0.5 bg-yellow-300 px-1 text-black underline decoration-black decoration-2 underline-offset-2' : 'mx-0.5 bg-danger px-1 text-white line-through'}>
        {token.value}{' '}
      </span>
    ))}
  </p>
}

function WritingSampleComparison({ draftContent, sample }: { draftContent: string; sample: PracticePromptSample }) {
  const comparison = compareWritingContent(draftContent, sample.content)
  return <div className="space-y-3 border-t-2 border-border pt-4">
    <div className={`border-2 p-3 text-sm font-black ${comparison.isContentMatch ? 'border-secondary bg-secondary/15 text-foreground' : 'border-danger bg-danger/10 text-foreground'}`}>
      {comparison.isContentMatch ? 'Nội dung bài viết khớp với bài mẫu. Khác biệt dấu câu hoặc xuống dòng được bỏ qua.' : 'Các từ khác nhau được tô màu: đỏ là phần thừa trong bài của bạn, vàng là phần còn thiếu so với bài mẫu.'}
    </div>
    {!comparison.isContentMatch && <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-2 border-2 border-border bg-danger/5 p-4"><h4 className="text-xs font-black uppercase text-danger">Bài của bạn</h4><WritingTokens tokens={comparison.learnerTokens} missing={false} /></div>
      <div className="space-y-2 border-2 border-border bg-yellow-100 p-4"><h4 className="text-xs font-black uppercase text-foreground">Bài mẫu — {sample.title}</h4><WritingTokens tokens={comparison.sampleTokens} missing /></div>
    </div>}
  </div>
}

interface LongFormPromptResultProps {
  draftContent: string
  samples: PracticePromptSample[]
  isLoadingSamples: boolean
}

export function LongFormPromptResult({ draftContent, samples, isLoadingSamples }: LongFormPromptResultProps) {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null)
  const selectedSample = samples.find((sample) => sample.id === selectedSampleId) ?? samples[0]

  return <article className="neo-card space-y-3 border-2 border-border bg-card p-5 shadow-[3px_3px_0_var(--border)]">
    <div className="flex items-center gap-2 border-b-2 border-border pb-2 text-xs font-black uppercase text-secondary"><PenTool size={14} /> Bài tự luận đã nộp của bạn</div>
    <div className="border-2 border-border bg-muted/40 p-4 text-sm font-semibold leading-relaxed whitespace-pre-wrap">{draftContent}</div>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black text-foreground">So sánh với bài mẫu</h3>{isLoadingSamples && <span className="text-xs font-bold text-muted-foreground">Đang tải bài mẫu...</span>}</div>
      {samples.length > 0 ? <>
        <div className="flex flex-wrap gap-2">{samples.map((sample) => <Button key={sample.id} type="button" variant={selectedSample?.id === sample.id ? 'secondary' : 'ghost'} onClick={() => setSelectedSampleId(sample.id)} className="min-h-8 px-3 py-1 text-xs">{sample.title}</Button>)}</div>
        {selectedSample && <WritingSampleComparison draftContent={draftContent} sample={selectedSample} />}
      </> : !isLoadingSamples ? <p className="border-2 border-border bg-muted/40 p-3 text-sm font-semibold text-muted-foreground">Chưa có bài mẫu được xuất bản cho đề này.</p> : null}
    </div>
  </article>
}
