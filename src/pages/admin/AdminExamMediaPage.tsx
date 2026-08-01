import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileAudio, FolderArchive, ImagePlus, Loader2, MessageSquare, Sparkles, Trash2, Upload, Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { generateAudio } from '@/services/api/generateAudio.api'
import { adminExamMediaService, type B1MediaResource, type B1QuestionReviewEditor, type B1SignQuestion, type ExamMediaAsset } from '@/services/supabase/adminExamMedia.service'
import { needsMediaReplacementConfirmation } from '@/features/exam-content/mediaReplacement'
import { getImagePresentation, IMAGE_CROP_OPTIONS } from '@/features/exam-content/imagePresentation'

const languageOptions = [
  { value: 'de-DE', label: 'Tiếng Đức (de-DE)' },
  { value: 'en-US', label: 'Tiếng Anh (en-US)' },
]

type PendingAudioAction =
  | { resource: B1MediaResource; kind: 'url'; url: string | null }
  | { resource: B1MediaResource; kind: 'upload'; file: File }
  | { resource: B1MediaResource; kind: 'tts' }

export default function AdminExamMediaPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'audio' | 'signs' | 'reviews' | 'vault'>('audio')
  const [selected, setSelected] = useState<B1MediaResource | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [language, setLanguage] = useState('de-DE')
  const [selectedQuestion, setSelectedQuestion] = useState<B1QuestionReviewEditor | null>(null)
  const [questionTranslation, setQuestionTranslation] = useState('')
  const [questionExplanation, setQuestionExplanation] = useState('')
  const [pendingAudioAction, setPendingAudioAction] = useState<PendingAudioAction | null>(null)
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<ExamMediaAsset | null>(null)
  const [isApplyingAudioAction, setIsApplyingAudioAction] = useState(false)

  const resourcesQuery = useQuery({ queryKey: ['admin-b1-media', id], queryFn: () => adminExamMediaService.listResources(id!), enabled: Boolean(id) })
  const signsQuery = useQuery({ queryKey: ['admin-b1-signs', id], queryFn: () => adminExamMediaService.listSigns(id!), enabled: Boolean(id) })
  const questionReviewsQuery = useQuery({ queryKey: ['admin-b1-question-reviews', id], queryFn: () => adminExamMediaService.listQuestionReviews(id!), enabled: Boolean(id) })
  const assetsQuery = useQuery({ queryKey: ['admin-b1-media-assets', id], queryFn: () => adminExamMediaService.listAssets(id!), enabled: Boolean(id) })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-b1-media', id] })

  const updateAudio = useMutation({
    mutationFn: ({ resource, url }: { resource: B1MediaResource; url: string | null }) => adminExamMediaService.setAudioUrl(id!, resource, url),
    onSuccess: async () => { await refresh(); showToast({ type: 'success', title: 'Đã lưu audio cho nội dung B1' }) },
    onError: () => showToast({ type: 'error', title: 'Không thể lưu audio' }),
  })

  const publish = useMutation({
    mutationFn: ({ resource, value }: { resource: B1MediaResource; value: boolean }) => adminExamMediaService.setPublished(id!, resource, value),
    onSuccess: refresh,
  })

  const publishExam = useMutation({
    mutationFn: (isPublished: boolean) => adminExamMediaService.setExamPublished(id!, isPublished),
    onSuccess: () => showToast({ type: 'success', title: 'Đã cập nhật trạng thái xuất bản đề B1' }),
    onError: () => showToast({ type: 'error', title: 'Không thể xuất bản đề B1' }),
  })

  const updateQuestionReview = useMutation({
    mutationFn: () => adminExamMediaService.updateQuestionReview(id!, selectedQuestion!.id, { translation: questionTranslation.trim() || null, explanation: questionExplanation.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-question-reviews', id] })
      showToast({ type: 'success', title: 'Đã lưu bản dịch và lời giải' })
    },
    onError: () => showToast({ type: 'error', title: 'Không thể lưu lời giải' }),
  })

  const chooseResource = (resource: B1MediaResource) => { setSelected(resource); setAudioUrl(resource.audio_url ?? '') }
  const chooseQuestion = (question: B1QuestionReviewEditor) => { setSelectedQuestion(question); setQuestionTranslation(question.translation ?? ''); setQuestionExplanation(question.explanation ?? '') }

  const selectedSupportsAudio = selected?.skill === 'listening' || selected?.skill === 'writing' || selected?.skill === 'speaking'
  const findAttachedAudioAsset = (resource: B1MediaResource) => (assetsQuery.data ?? []).find((asset) => asset.media_kind === 'audio' && asset.public_url === resource.audio_url && asset.usages.some((usage) => usage.resource_type === resource.kind && usage.resource_id === resource.id && usage.usage_role === 'audio'))
  const readyToPublish = (resourcesQuery.data ?? []).length > 0 && (resourcesQuery.data ?? []).every((resource) => resource.is_published)

  const applyAudioAction = async (action: PendingAudioAction) => {
    setIsApplyingAudioAction(true)
    try {
      if (action.kind === 'url') {
        if (!action.url) await updateAudio.mutateAsync({ resource: action.resource, url: null })
        else {
          const asset = await adminExamMediaService.createExternalAudioAsset(id!, { url: action.url, displayName: `${action.resource.title} · URL`, replacesAssetId: findAttachedAudioAsset(action.resource)?.id })
          await adminExamMediaService.attachAudioAsset(id!, action.resource, asset)
          await refresh()
          await queryClient.invalidateQueries({ queryKey: ['admin-b1-media-assets', id] })
        }
      } else if (action.kind === 'upload') {
        const asset = await adminExamMediaService.uploadAudio(id!, action.file, action.resource.source_key, findAttachedAudioAsset(action.resource)?.id)
        setAudioUrl(asset.public_url)
        await adminExamMediaService.attachAudioAsset(id!, action.resource, asset)
        await refresh()
        await queryClient.invalidateQueries({ queryKey: ['admin-b1-media-assets', id] })
      } else {
        const result = await generateAudio(action.resource.text, language)
        if (!result.audioUrl) throw new Error('TTS chưa tạo được audio')
        setAudioUrl(result.audioUrl)
        const asset = await adminExamMediaService.createExternalAudioAsset(id!, { url: result.audioUrl, displayName: `${action.resource.title} · TTS`, languageCode: language, transcript: action.resource.text, replacesAssetId: findAttachedAudioAsset(action.resource)?.id })
        await adminExamMediaService.attachAudioAsset(id!, action.resource, asset)
        await refresh()
        await queryClient.invalidateQueries({ queryKey: ['admin-b1-media-assets', id] })
        showToast({ type: 'success', title: 'Đã tạo và gắn audio TTS' })
      }
    } catch (error) {
      showToast({ type: 'error', title: action.kind === 'tts' ? 'Tạo TTS thất bại' : 'Không thể lưu audio', message: error instanceof Error ? error.message : undefined })
    } finally {
      setIsApplyingAudioAction(false)
      setPendingAudioAction(null)
    }
  }

  const requestAudioAction = (action: PendingAudioAction) => {
    const nextUrl = action.kind === 'url' ? action.url : null
    if (needsMediaReplacementConfirmation({ isPublished: action.resource.is_published, currentUrl: action.resource.audio_url, nextUrl })) {
      setPendingAudioAction(action)
      return
    }
    void applyAudioAction(action)
  }

  const onUpload = (file?: File) => {
    if (!file || !selected) return
    requestAudioAction({ resource: selected, kind: 'upload', file })
  }

  const onSignUpload = async (questionId: string, sourceKey: string, file?: File) => {
    if (!file) return
    try {
      const replacingAsset = (assetsQuery.data ?? []).find((candidate) => candidate.media_kind === 'image' && candidate.usages.some((usage) => usage.resource_type === 'question' && usage.resource_id === questionId && usage.usage_role === 'image'))
      const asset = await adminExamMediaService.uploadSignImage(id!, file, sourceKey, replacingAsset?.id)
      await adminExamMediaService.attachSignImage(id!, questionId, asset)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-signs', id] })
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-media-assets', id] })
      showToast({ type: 'success', title: 'Đã lưu ảnh biển báo' })
    } catch { showToast({ type: 'error', title: 'Không thể tải ảnh biển báo lên' }) }
  }

  const onSignAltUpdate = async (sign: B1SignQuestion, imageAlt: string) => {
    if (imageAlt.trim() === sign.image_alt) return
    try {
      await adminExamMediaService.updateSignImageAlt(id!, sign, imageAlt)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-signs', id] })
      showToast({ type: 'success', title: 'Đã lưu mô tả ảnh biển báo' })
    } catch { showToast({ type: 'error', title: 'Không thể lưu mô tả ảnh biển báo' }) }
  }

  const onSignCropUpdate = async (sign: B1SignQuestion, imageCrop: string) => {
    if (imageCrop === sign.image_crop) return
    try {
      await adminExamMediaService.updateSignImageCrop(id!, sign, imageCrop)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-signs', id] })
      showToast({ type: 'success', title: 'Đã lưu khung hiển thị ảnh biển báo' })
    } catch { showToast({ type: 'error', title: 'Không thể lưu khung hiển thị ảnh biển báo' }) }
  }

  const deleteAsset = async () => {
    if (!pendingDeleteAsset) return
    try {
      await adminExamMediaService.deleteAsset(id!, pendingDeleteAsset)
      await queryClient.invalidateQueries({ queryKey: ['admin-b1-media-assets', id] })
      showToast({ type: 'success', title: 'Đã xóa media không còn được sử dụng' })
    } catch (error) {
      showToast({ type: 'error', title: 'Không thể xóa media', message: error instanceof Error ? error.message : undefined })
    } finally {
      setPendingDeleteAsset(null)
    }
  }

  if (!id) {
    return <div role="alert" className="neo-card border-3 border-rose-500 bg-rose-50 p-5 font-bold text-rose-950">Không tìm thấy mã đề thi để quản lý media.</div>
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header Banner */}
      <header className="neo-card bg-card p-5 border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border-3 border-border bg-primary flex items-center justify-center text-primary-foreground shadow-[2px_2px_0_var(--border)]">
            <FileAudio size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Media & Lời giải cho đề thi B1</h1>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Gắn audio Listening, tạo TTS cho Writing/Speaking, quản lý ảnh Signs và biên soạn Lời giải đáp án.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Button asChild variant="ghost" className="px-5 text-xs font-black">
            <Link to={`/app/admin/exams/${id}`}>Quay lại trình xây dựng đề</Link>
          </Button>
          <Button
            onClick={() => publishExam.mutate(true)}
            disabled={publishExam.isPending || !readyToPublish}
            variant="primary"
            className="px-5 text-xs font-black"
          >
            Xuất bản đề B1
          </Button>
          {!readyToPublish && (
            <p className="text-[11px] font-bold text-rose-600">Xuất bản tất cả phần bắt buộc trước.</p>
          )}
        </div>
      </header>

      {/* Main Tab Navigation Bar */}
      <div className="neo-card bg-card p-3 border-3 border-border shadow-[3px_3px_0_var(--border)] flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeTab === 'audio' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('audio')}
          className="min-h-9 px-4 text-xs font-black"
        >
          <Volume2 size={16} /> Audio & TTS ({resourcesQuery.data?.length ?? 0})
        </Button>
        <Button
          type="button"
          variant={activeTab === 'signs' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('signs')}
          className="min-h-9 px-4 text-xs font-black"
        >
          <ImagePlus size={16} /> Ảnh Signs 1–10 ({signsQuery.data?.length ?? 0})
        </Button>
        <Button
          type="button"
          variant={activeTab === 'reviews' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('reviews')}
          className="min-h-9 px-4 text-xs font-black"
        >
          <MessageSquare size={16} /> Bản dịch & Lời giải ({questionReviewsQuery.data?.length ?? 0})
        </Button>
        <Button
          type="button"
          variant={activeTab === 'vault' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('vault')}
          className="min-h-9 px-4 text-xs font-black"
        >
          <FolderArchive size={16} /> Kho Media Asset ({assetsQuery.data?.length ?? 0})
        </Button>
      </div>

      {/* TAB 1: AUDIO & TTS */}
      <div className={activeTab === 'audio' ? 'grid gap-6 lg:grid-cols-[1fr_420px]' : 'hidden'}>
        <section className="space-y-3">
          {resourcesQuery.isLoading && <div className="neo-card animate-pulse p-6 font-black border-3 border-border">Đang tải nội dung…</div>}
          {(resourcesQuery.data ?? []).map((resource) => (
            <article
              key={`${resource.kind}-${resource.id}`}
              className={`neo-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-3 border-border transition-all ${
                selected?.id === resource.id ? 'border-primary bg-primary/10' : 'bg-card'
              }`}
            >
              <div>
                <p className="text-[11px] font-black uppercase text-secondary tracking-wider">{resource.skill} · {resource.kind}</p>
                <h2 className="font-black text-base text-foreground">{resource.title}</h2>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {resource.audio_url ? 'Đã có audio' : 'Chưa có audio'} · {resource.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                </p>
                {resource.usage && (
                  <p className="mt-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-300 w-fit">
                    Đang được dùng trong {resource.usage.sectionCount} section · {resource.usage.exams.join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" className="text-xs font-black" onClick={() => chooseResource(resource)}>
                  <Volume2 size={16} /> Quản lý
                </Button>
                <Button
                  variant={resource.is_published ? 'ghost' : 'secondary'}
                  className="text-xs font-black"
                  onClick={() => publish.mutate({ resource, value: !resource.is_published })}
                >
                  {resource.is_published ? 'Ẩn' : 'Xuất bản'}
                </Button>
              </div>
            </article>
          ))}
        </section>

        {/* Audio Management Inspector Panel */}
        <aside className="neo-card h-fit p-5 border-3 border-border bg-card shadow-[3px_3px_0_var(--border)]">
          <h2 className="text-lg font-black">{selected ? selected.title : 'Chọn một nội dung'}</h2>
          {selected ? (
            <div className="mt-4 space-y-4">
              {selectedSupportsAudio ? (
                <>
                  <div>
                    <Label htmlFor="audio-url" className="text-xs font-black">Đường dẫn audio</Label>
                    <Input
                      id="audio-url"
                      className="mt-1 text-xs"
                      value={audioUrl}
                      onChange={(event) => setAudioUrl(event.target.value)}
                      placeholder="https://…/audio.mp3"
                    />
                  </div>

                  {selected.is_published && selected.audio_url && (
                    <p className="border-2 border-rose-400 bg-rose-50 p-3 text-xs font-bold text-rose-950">
                      Nội dung này đã xuất bản. Thay audio chỉ áp dụng cho attempt mới; attempt đã mở vẫn dùng snapshot cũ.
                    </p>
                  )}

                  <Button
                    className="w-full text-xs font-black"
                    onClick={() => requestAudioAction({ resource: selected, kind: 'url', url: audioUrl.trim() || null })}
                    disabled={updateAudio.isPending || isApplyingAudioAction}
                  >
                    Lưu đường dẫn audio
                  </Button>

                  <input ref={uploadInputRef} type="file" accept="audio/*" className="sr-only" onChange={(event) => onUpload(event.target.files?.[0])} />
                  <Button
                    variant="ghost"
                    className="w-full text-xs font-black"
                    disabled={isApplyingAudioAction}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <Upload size={16} /> Tải file audio lên
                  </Button>

                  <div className="border-t-2 border-border pt-4 space-y-2">
                    <Label htmlFor="tts-source" className="text-xs font-black">Nội dung tạo TTS</Label>
                    <Textarea id="tts-source" className="min-h-32 text-xs" value={selected.text} readOnly />
                    <p className="text-[11px] font-semibold text-muted-foreground">TTS sẽ đọc chính xác nội dung này.</p>

                    <Label htmlFor="tts-language" className="block text-xs font-black pt-2">Ngôn ngữ đọc TTS</Label>
                    <Select id="tts-language" value={language} onChange={setLanguage} options={languageOptions} className="text-xs" />

                    <Button
                      variant="secondary"
                      className="mt-2 w-full text-xs font-black"
                      disabled={!selected.text.trim() || isApplyingAudioAction}
                      onClick={() => requestAudioAction({ resource: selected, kind: 'tts' })}
                    >
                      {isApplyingAudioAction ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      Tạo audio TTS
                    </Button>
                  </div>

                  {audioUrl && <audio className="w-full mt-2" controls src={audioUrl} />}
                </>
              ) : (
                <p className="border-2 border-border bg-muted p-3 text-xs font-semibold">
                  Phần này không cần audio. Hãy bấm “Xuất bản” trong danh sách bên trái khi đã kiểm tra nội dung.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">Chọn nội dung ở bên trái để gắn media.</p>
          )}
        </aside>
      </div>

      {/* TAB 2: ẢNH SIGNS 1–10 */}
      <div className={activeTab === 'signs' ? 'space-y-6' : 'hidden'}>
        <section className="neo-card p-5 border-3 border-border bg-card shadow-[3px_3px_0_var(--border)] space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-border pb-3">
            <ImagePlus size={22} className="text-primary" />
            <div>
              <h2 className="text-lg font-black">Ảnh Biển báo Signs 1–10</h2>
              <p className="text-xs font-semibold text-muted-foreground">
                Thêm thủ công ảnh, mô tả thay thế (alt text) và khung hiển thị cho từng biển báo có đáp án.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(signsQuery.data ?? []).map((sign) => {
              const imagePresentation = getImagePresentation(sign.metadata)
              return (
                <article key={sign.id} className="border-2 border-border bg-card p-3 shadow-[2px_2px_0_var(--border)] flex flex-col justify-between">
                  <div>
                    <p className="font-black text-sm text-foreground">Biển báo câu {sign.source_number ?? sign.source_key}</p>
                    {sign.image_url ? (
                      <img
                        className={`mt-2 aspect-square w-full border border-border ${imagePresentation.fitClass}`}
                        style={{ objectPosition: imagePresentation.objectPosition }}
                        src={sign.image_url}
                        alt={sign.image_alt || `Biển báo ${sign.source_number ?? sign.source_key}`}
                      />
                    ) : (
                      <div className="mt-2 flex aspect-square items-center justify-center bg-muted text-xs font-bold border border-border">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <Label htmlFor={`sign-crop-${sign.id}`} className="text-[11px] font-black">Hiển thị ảnh</Label>
                      <Select
                        id={`sign-crop-${sign.id}`}
                        value={sign.image_crop}
                        onChange={(value) => void onSignCropUpdate(sign, value)}
                        options={[...IMAGE_CROP_OPTIONS]}
                        className="mt-0.5 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`sign-alt-${sign.id}`} className="text-[11px] font-black">
                        Mô tả ảnh biển báo {sign.source_number ?? sign.source_key}
                      </Label>
                      <Input
                        id={`sign-alt-${sign.id}`}
                        defaultValue={sign.image_alt}
                        className="mt-0.5 text-xs"
                        placeholder="Ví dụ: Biển cấm đỗ xe"
                        onBlur={(event) => void onSignAltUpdate(sign, event.target.value)}
                      />
                    </div>
                    <label className="block pt-1">
                      <span className="sr-only">Tải ảnh {sign.source_key}</span>
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-xs"
                        onChange={(event) => void onSignUpload(sign.id, sign.source_key, event.target.files?.[0])}
                      />
                    </label>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      {/* TAB 3: BẢN DỊCH VÀ LỜI GIẢI */}
      <div className={activeTab === 'reviews' ? 'grid gap-6 lg:grid-cols-[1fr_420px]' : 'hidden'}>
        <section className="neo-card p-5 border-3 border-border bg-card shadow-[3px_3px_0_var(--border)]">
          <h2 className="text-lg font-black">Danh sách câu hỏi cần biên soạn Lời giải</h2>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
            Chọn câu hỏi để người học nhìn thấy bản dịch và lời giải chi tiết sau khi nộp bài.
          </p>

          <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
            {(questionReviewsQuery.data ?? []).map((question) => (
              <Button
                key={question.id}
                variant={selectedQuestion?.id === question.id ? 'secondary' : 'ghost'}
                className="h-auto w-full justify-start py-3 text-left border border-border"
                onClick={() => chooseQuestion(question)}
              >
                <span>
                  <span className="block text-[11px] font-black uppercase text-secondary">
                    {question.activity_title} · Câu {question.source_number ?? '—'}
                  </span>
                  <span className="block text-xs font-bold text-foreground whitespace-normal mt-0.5">
                    {question.prompt}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>

        {/* Question Review Form Editor */}
        <aside className="neo-card h-fit p-5 border-3 border-border bg-card shadow-[3px_3px_0_var(--border)]">
          <h2 className="text-lg font-black">{selectedQuestion ? `Câu ${selectedQuestion.source_number ?? '—'}` : 'Chọn một câu hỏi'}</h2>
          {selectedQuestion ? (
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="question-translation" className="text-xs font-black">Bản dịch tiếng Việt</Label>
                <Textarea
                  id="question-translation"
                  value={questionTranslation}
                  onChange={(event) => setQuestionTranslation(event.target.value)}
                  className="mt-1 min-h-24 text-xs"
                  placeholder="Nhập bản dịch tự nhiên của câu hỏi và đáp án…"
                />
              </div>
              <div>
                <Label htmlFor="question-explanation" className="text-xs font-black">Lời giải chi tiết</Label>
                <Textarea
                  id="question-explanation"
                  value={questionExplanation}
                  onChange={(event) => setQuestionExplanation(event.target.value)}
                  className="mt-1 min-h-36 text-xs"
                  placeholder="Giải thích vì sao đáp án đúng và kiến thức cần nhớ…"
                />
              </div>
              <Button className="w-full text-xs font-black" onClick={() => updateQuestionReview.mutate()} disabled={updateQuestionReview.isPending}>
                Lưu bản dịch và lời giải
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">Chọn câu bên trái để biên soạn nội dung học tập.</p>
          )}
        </aside>
      </div>

      {/* TAB 4: KHO MEDIA ASSETS */}
      <div className={activeTab === 'vault' ? 'space-y-6' : 'hidden'}>
        <section className="neo-card p-5 border-3 border-border bg-card shadow-[3px_3px_0_var(--border)] space-y-4">
          <div className="flex items-center gap-2 border-b-2 border-border pb-3">
            <FolderArchive size={22} className="text-primary" />
            <div>
              <h2 className="text-lg font-black">Thư viện media</h2>
              <p className="text-xs font-semibold text-muted-foreground">
                Media có phiên bản và nơi đang sử dụng; chỉ file không còn tham chiếu mới có thể xóa.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(assetsQuery.data ?? []).map((asset) => (
              <article key={asset.id} className="border-2 border-border bg-card p-4 shadow-[2px_2px_0_var(--border)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase text-secondary">
                      {asset.media_kind === 'audio' ? 'Audio' : 'Ảnh'} · Phiên bản {asset.version_number}
                    </p>
                    <h3 className="font-black text-sm text-foreground">{asset.display_name}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {asset.bucket_id === 'external' ? 'Nguồn ngoài/TTS' : `${asset.bucket_id}/${asset.storage_path}`}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    disabled={asset.usage_count > 0}
                    onClick={() => setPendingDeleteAsset(asset)}
                    className="text-xs font-black shrink-0"
                  >
                    {asset.usage_count > 0 ? 'Đang được sử dụng' : <><Trash2 size={15} /> Xóa</>}
                  </Button>
                </div>

                {asset.media_kind === 'audio' ? (
                  <audio className="mt-3 w-full" controls src={asset.public_url} />
                ) : (
                  <img className="mt-3 h-32 w-full object-contain border border-border" src={asset.public_url} alt={asset.display_name} />
                )}

                <p className="mt-2 text-xs font-bold text-foreground">
                  {asset.usage_count > 0 ? `Đang được dùng ở ${asset.usage_count} nơi` : 'Chưa được gắn vào nội dung nào.'}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        open={Boolean(pendingAudioAction)}
        title="Thay audio đã xuất bản?"
        description="Nội dung mới sẽ được dùng cho attempt mở sau này. Attempt đã bắt đầu giữ nguyên snapshot và không bị thay đổi."
        confirmLabel="Thay audio"
        onConfirm={() => { if (pendingAudioAction) void applyAudioAction(pendingAudioAction) }}
        onCancel={() => setPendingAudioAction(null)}
      />
      <ConfirmModal
        open={Boolean(pendingDeleteAsset)}
        title="Xóa media không dùng?"
        description="File và metadata sẽ bị xóa vĩnh viễn. Chỉ tiếp tục khi bạn chắc chắn media này không còn cần dùng."
        confirmLabel="Xóa media"
        variant="danger"
        onConfirm={() => void deleteAsset()}
        onCancel={() => setPendingDeleteAsset(null)}
      />
    </div>
  )
}
