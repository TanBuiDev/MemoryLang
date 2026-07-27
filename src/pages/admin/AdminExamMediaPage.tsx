import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileAudio, ImagePlus, Loader2, Sparkles, Upload, Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { generateAudio } from '@/services/api/generateAudio.api'
import { adminExamMediaService, type B1MediaResource, type B1QuestionReviewEditor } from '@/services/supabase/adminExamMedia.service'

const languageOptions = [
  { value: 'de-DE', label: 'Tiếng Đức (de-DE)' },
  { value: 'en-US', label: 'Tiếng Anh (en-US)' },
]

export default function AdminExamMediaPage() {
  const queryClient = useQueryClient()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<B1MediaResource | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [language, setLanguage] = useState('de-DE')
  const [selectedQuestion, setSelectedQuestion] = useState<B1QuestionReviewEditor | null>(null)
  const [questionTranslation, setQuestionTranslation] = useState('')
  const [questionExplanation, setQuestionExplanation] = useState('')
  const resourcesQuery = useQuery({ queryKey: ['admin-b1-media'], queryFn: adminExamMediaService.listResources })
  const signsQuery = useQuery({ queryKey: ['admin-b1-signs'], queryFn: adminExamMediaService.listSigns })
  const questionReviewsQuery = useQuery({ queryKey: ['admin-b1-question-reviews'], queryFn: adminExamMediaService.listQuestionReviews })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-b1-media'] })
  const updateAudio = useMutation({
    mutationFn: ({ resource, url }: { resource: B1MediaResource; url: string | null }) => adminExamMediaService.setAudioUrl(resource, url),
    onSuccess: async () => { await refresh(); showToast({ type: 'success', title: 'Đã lưu audio cho nội dung B1' }) },
    onError: () => showToast({ type: 'error', title: 'Không thể lưu audio' }),
  })
  const publish = useMutation({
    mutationFn: ({ resource, value }: { resource: B1MediaResource; value: boolean }) => adminExamMediaService.setPublished(resource, value),
    onSuccess: refresh,
  })
  const generate = useMutation({
    mutationFn: async (resource: B1MediaResource) => {
      const result = await generateAudio(resource.text, language)
      if (!result.audioUrl) throw new Error('TTS chưa tạo được audio')
      await adminExamMediaService.setAudioUrl(resource, result.audioUrl)
    },
    onSuccess: async () => { await refresh(); showToast({ type: 'success', title: 'Đã tạo và gắn audio TTS' }) },
    onError: (error) => showToast({ type: 'error', title: 'Tạo TTS thất bại', message: error instanceof Error ? error.message : undefined }),
  })
  const publishExam = useMutation({
    mutationFn: (isPublished: boolean) => adminExamMediaService.setB1ExamPublished(isPublished),
    onSuccess: () => showToast({ type: 'success', title: 'Đã cập nhật trạng thái xuất bản đề B1' }),
    onError: () => showToast({ type: 'error', title: 'Không thể xuất bản đề B1' }),
  })
  const updateQuestionReview = useMutation({
    mutationFn: () => adminExamMediaService.updateQuestionReview(selectedQuestion!.id, { translation: questionTranslation.trim() || null, explanation: questionExplanation.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-question-reviews'] })
      showToast({ type: 'success', title: 'Đã lưu bản dịch và lời giải' })
    },
    onError: () => showToast({ type: 'error', title: 'Không thể lưu lời giải' }),
  })

  const chooseResource = (resource: B1MediaResource) => { setSelected(resource); setAudioUrl(resource.audio_url ?? '') }
  const chooseQuestion = (question: B1QuestionReviewEditor) => { setSelectedQuestion(question); setQuestionTranslation(question.translation ?? ''); setQuestionExplanation(question.explanation ?? '') }
  const selectedSupportsAudio = selected?.skill === 'listening' || selected?.skill === 'writing' || selected?.skill === 'speaking'
  const readyToPublish = (resourcesQuery.data ?? []).length > 0 && (resourcesQuery.data ?? []).every((resource) => resource.is_published)
  const onUpload = async (file?: File) => {
    if (!file || !selected) return
    try {
      const url = await adminExamMediaService.uploadAudio(file, selected.source_key)
      setAudioUrl(url)
      await updateAudio.mutateAsync({ resource: selected, url })
    } catch { showToast({ type: 'error', title: 'Không thể tải file audio lên' }) }
  }
  const onSignUpload = async (questionId: string, sourceKey: string, file?: File) => {
    if (!file) return
    try {
      const url = await adminExamMediaService.uploadSignImage(file, sourceKey)
      await adminExamMediaService.setSignImage(questionId, url)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-signs'] })
      showToast({ type: 'success', title: 'Đã lưu ảnh biển báo' })
    } catch { showToast({ type: 'error', title: 'Không thể tải ảnh biển báo lên' }) }
  }

  return <div className="space-y-6">
    <header className="neo-card bg-primary p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><FileAudio size={30} /><div><h1 className="text-2xl font-black">Media cho đề thi B1</h1><p className="font-semibold">Thêm file audio, tạo TTS và hoàn thiện ảnh Signs trước khi xuất bản.</p></div></div><div><Button onClick={() => publishExam.mutate(true)} disabled={publishExam.isPending || !readyToPublish}>Xuất bản đề B1</Button>{!readyToPublish && <p className="mt-2 text-xs font-bold">Xuất bản tất cả phần bắt buộc trước.</p>}</div></div></header>
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        {resourcesQuery.isLoading && <div className="neo-card animate-pulse p-6 font-black">Đang tải nội dung…</div>}
        {(resourcesQuery.data ?? []).map((resource) => <article key={`${resource.kind}-${resource.id}`} className="neo-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-secondary">{resource.skill} · {resource.kind}</p><h2 className="font-black">{resource.title}</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">{resource.audio_url ? 'Đã có audio' : 'Chưa có audio'} · {resource.is_published ? 'Đã xuất bản' : 'Bản nháp'}</p></div><div className="flex gap-2"><Button variant="ghost" onClick={() => chooseResource(resource)}><Volume2 size={16} />Quản lý</Button><Button variant={resource.is_published ? 'ghost' : 'secondary'} onClick={() => publish.mutate({ resource, value: !resource.is_published })}>{resource.is_published ? 'Ẩn' : 'Xuất bản'}</Button></div></article>)}
      </section>
      <aside className="neo-card h-fit p-5">
        <h2 className="text-xl font-black">{selected ? selected.title : 'Chọn một nội dung'}</h2>
        {selected ? <div className="mt-5 space-y-4">{selectedSupportsAudio ? <><div><Label htmlFor="audio-url">Đường dẫn audio</Label><Input id="audio-url" className="mt-1" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…/audio.mp3" /></div><Button className="w-full" onClick={() => updateAudio.mutate({ resource: selected, url: audioUrl.trim() || null })} disabled={updateAudio.isPending}>Lưu đường dẫn audio</Button><input ref={uploadInputRef} type="file" accept="audio/*" className="sr-only" onChange={(event) => void onUpload(event.target.files?.[0])} /><Button variant="ghost" className="w-full" onClick={() => uploadInputRef.current?.click()}><Upload size={16} />Tải file audio lên</Button><div className="border-t-2 border-border pt-4"><Label htmlFor="tts-source">Nội dung tạo TTS</Label><Textarea id="tts-source" className="mt-1 min-h-40" value={selected.text} readOnly /><p className="mt-1 text-xs font-semibold text-muted-foreground">TTS sẽ đọc chính xác nội dung này.</p><Label htmlFor="tts-language" className="mt-3 block">Tạo bằng TTS</Label><Select id="tts-language" value={language} onChange={setLanguage} options={languageOptions} className="mt-1" /><Button variant="secondary" className="mt-3 w-full" disabled={!selected.text.trim() || generate.isPending} onClick={() => generate.mutate(selected)}>{generate.isPending ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}Tạo audio TTS</Button></div>{audioUrl && <audio className="w-full" controls src={audioUrl} />}</> : <p className="border-2 border-border bg-muted p-3 text-sm font-semibold">Phần này không cần audio. Hãy bấm “Xuất bản” trong danh sách bên trái khi đã kiểm tra nội dung.</p>}</div> : <p className="mt-2 text-sm font-semibold text-muted-foreground">Chọn nội dung ở bên trái để gắn media.</p>}
      </aside>
    </div>
    <section className="neo-card p-5"><div className="flex items-center gap-2"><ImagePlus size={20} /><div><h2 className="text-xl font-black">Ảnh Signs 1–10</h2><p className="text-sm font-semibold text-muted-foreground">Thêm thủ công ảnh cho từng biển báo có đáp án.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{(signsQuery.data ?? []).map((sign) => <article key={sign.id} className="border-2 border-border bg-card p-3"><p className="font-black">{sign.source_number ?? sign.source_key}</p>{sign.image_url ? <img className="mt-2 aspect-square w-full object-contain" src={sign.image_url} alt={`Biển báo ${sign.source_number ?? sign.source_key}`} /> : <div className="mt-2 flex aspect-square items-center justify-center bg-muted text-xs font-bold">Chưa có ảnh</div>}<label className="mt-3 block"><span className="sr-only">Tải ảnh {sign.source_key}</span><Input type="file" accept="image/*" className="text-xs" onChange={(event) => void onSignUpload(sign.id, sign.source_key, event.target.files?.[0])} /></label></article>)}</div></section>
    <section className="grid gap-6 lg:grid-cols-[1fr_420px]"><div className="neo-card p-5"><h2 className="text-xl font-black">Bản dịch và lời giải đáp án</h2><p className="mt-1 text-sm font-semibold text-muted-foreground">Chọn câu hỏi để người học nhìn thấy bản dịch và lời giải chi tiết sau khi nộp bài.</p><div className="mt-5 max-h-[34rem] space-y-2 overflow-y-auto">{(questionReviewsQuery.data ?? []).map((question) => <Button key={question.id} variant={selectedQuestion?.id === question.id ? 'secondary' : 'ghost'} className="h-auto w-full justify-start py-3 text-left" onClick={() => chooseQuestion(question)}><span><span className="block text-xs uppercase">{question.activity_title} · Câu {question.source_number ?? '—'}</span><span className="block whitespace-normal">{question.prompt}</span></span></Button>)}</div></div><aside className="neo-card h-fit p-5"><h2 className="text-xl font-black">{selectedQuestion ? `Câu ${selectedQuestion.source_number ?? '—'}` : 'Chọn một câu hỏi'}</h2>{selectedQuestion ? <div className="mt-4 space-y-4"><div><Label htmlFor="question-translation">Bản dịch tiếng Việt</Label><Textarea id="question-translation" value={questionTranslation} onChange={(event) => setQuestionTranslation(event.target.value)} className="mt-1 min-h-28" placeholder="Nhập bản dịch tự nhiên của câu hỏi và đáp án…" /></div><div><Label htmlFor="question-explanation">Lời giải chi tiết</Label><Textarea id="question-explanation" value={questionExplanation} onChange={(event) => setQuestionExplanation(event.target.value)} className="mt-1 min-h-40" placeholder="Giải thích vì sao đáp án đúng và kiến thức cần nhớ…" /></div><Button className="w-full" onClick={() => updateQuestionReview.mutate()} disabled={updateQuestionReview.isPending}>Lưu bản dịch và lời giải</Button></div> : <p className="mt-3 text-sm font-semibold text-muted-foreground">Chọn câu bên trái để biên soạn nội dung học tập.</p>}</aside></section>
  </div>
}
