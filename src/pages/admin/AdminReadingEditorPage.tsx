import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Volume2,
  HelpCircle,
  ScanSearch,
  Eye,
  ListPlus,
  Pencil,
  Sparkles,
} from 'lucide-react'
import {
  adminReadingService,
  defaultReadingArticleOptions,
} from '@/services/supabase/adminReading.service'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { CreatableReadingSelect } from '@/components/reading/CreatableReadingSelect'
import { showToast } from '@/components/ui/toast'
import { buildReadingOption, normalizeReadingContent } from '@/utils/readingContent'
import { annotateReadingHtml } from '@/utils/readingVocabulary'
import { fillReadingQuizBlanks } from '@/utils/readingQuizContent'
import {
  getInitialReadingEditorMode,
  type ReadingEditorMode,
} from '@/utils/adminReadingPreview'
import { readingService } from '@/services/supabase/reading.service'
import { ReadingVocabularyPopover } from '@/components/reading/ReadingVocabularyPopover'
import { ReadingAudioPreview } from '@/components/reading/ReadingAudioPreview'
import { ReadingRichTextEditor } from '@/components/reading/ReadingRichTextEditor'
import {
  BulkQuestionImportModal,
  type ImportedReadingQuestion,
} from '@/components/reading/BulkQuestionImportModal'
import { getReadingVocabularyMatchMessage } from '@/utils/readingAdminUi'
import type {
  AccessTier,
  CEFRLevel,
  CreateArticleInput,
  QuestionType,
  ReadingArticleOptions,
  ReadingDifficulty,
  ReadingOptionField,
  ReadingPurpose,
  ReadingQuestionOption,
  ReadingArticleTerm,
} from '@/types/reading.types'

const questionTypeOptions = [
  { value: 'multiple_choice', label: 'Trắc nghiệm (Multiple Choice)' },
  { value: 'true_false', label: 'Đúng / Sai (True / False)' },
  { value: 'fill_blank', label: 'Điền từ (Fill in the blank)' },
]

interface LocalQuestion {
  id: string
  question_text: string
  question_type: QuestionType
  options: ReadingQuestionOption[]
  points: number
}

export default function AdminReadingEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = Boolean(id)

  const [saving, setSaving] = useState(false)
  const [generatingTts, setGeneratingTts] = useState(false)
  const [scanningTerms, setScanningTerms] = useState(false)
  const [matchedTermCount, setMatchedTermCount] = useState<number | null>(null)
  const [editorMode, setEditorMode] = useState<ReadingEditorMode>(
    () => getInitialReadingEditorMode(location.search)
  )
  const [articleTerms, setArticleTerms] = useState<ReadingArticleTerm[]>([])
  const [selectedTerm, setSelectedTerm] = useState<ReadingArticleTerm | null>(null)
  const [termPopoverPosition, setTermPopoverPosition] = useState({ x: 0, y: 0 })
  const [error, setError] = useState<string | null>(null)

  // Basic Form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('B1')
  const [difficulty, setDifficulty] = useState<ReadingDifficulty>('medium')
  const [purpose, setPurpose] = useState<ReadingPurpose>('General')
  const [topicsInput, setTopicsInput] = useState('Technology, General')
  const [accessTier, setAccessTier] = useState<AccessTier>('free')
  const [isPublished, setIsPublished] = useState(false)
  const [articleOptions, setArticleOptions] = useState<ReadingArticleOptions>(
    defaultReadingArticleOptions
  )

  // Content state
  const [contentInput, setContentInput] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [plainText, setPlainText] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Questions state
  const [questions, setQuestions] = useState<LocalQuestion[]>([])
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  useEffect(() => {
    void adminReadingService
      .getArticleOptions()
      .then(setArticleOptions)
      .catch((optionsError) => console.error('Không thể tải tùy chọn bài đọc:', optionsError))
  }, [])

  useEffect(() => {
    async function loadArticleToEdit() {
      if (!id) return
      try {
        const [detail, terms] = await Promise.all([
          adminReadingService.getArticleDetail(id),
          readingService.getArticleTerms(id).catch((termError) => {
            console.error('Không thể tải từ vựng bài đọc:', termError)
            return []
          }),
        ])
        if (detail) {
          setTitle(detail.title)
          setSubtitle(detail.subtitle || '')
          setCefrLevel(detail.cefr_level)
          setDifficulty(detail.difficulty)
          setPurpose(detail.purpose)
          setTopicsInput((detail.topics || []).join(', '))
          setAccessTier(detail.access_tier)
          setIsPublished(detail.is_published)
          setContentInput(detail.content_html)
          setContentHtml(detail.content_html)
          setPlainText(detail.plain_text)
          setAudioUrl(detail.audio_url || null)
          setArticleTerms(terms)
          setMatchedTermCount(terms.length)

          if (detail.questions && detail.questions.length > 0) {
            setQuestions(
              detail.questions.map((q) => ({
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options || [],
                points: q.points || 1,
              }))
            )
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Không thể tải thông tin bài đọc')
      }
    }

    void loadArticleToEdit()
  }, [id])

  useEffect(() => {
    setEditorMode(getInitialReadingEditorMode(location.search))
  }, [location.search])

  const handleContentChange = (value: string) => {
    const normalized = normalizeReadingContent(value)
    setContentInput(value)
    setContentHtml(normalized.contentHtml)
    setPlainText(normalized.plainText)
  }

  const handleCreateOption = async (
    field: ReadingOptionField,
    value: string,
    label: string
  ) => {
    const candidate = buildReadingOption(value, label)
    const updatedOptions = await adminReadingService.addArticleOption(field, value, label)
    setArticleOptions(updatedOptions)
    return updatedOptions[field].find((option) => option.value === candidate.value) || candidate
  }

  // Quiz Builder Handlers
  const handleAddQuestion = () => {
    const newQ: LocalQuestion = {
      id: `temp-${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
      points: 1,
    }
    setQuestions((prev) => [...prev, newQ])
  }

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleFillCorrectAnswers = () => {
    if (!questions || questions.length === 0) {
      showToast({
        type: 'warning',
        title: 'Chưa có câu hỏi',
        message: 'Vui lòng thêm các câu hỏi đọc hiểu bên dưới trước khi điền đáp án.',
      })
      return
    }

    const hasCorrectAnswer = questions.some((q) => q.options?.some((o) => o.is_correct))
    if (!hasCorrectAnswer) {
      showToast({
        type: 'warning',
        title: 'Chưa chọn đáp án đúng',
        message: 'Vui lòng đánh dấu đáp án đúng cho các câu hỏi bên dưới.',
      })
      return
    }

    const formattedQuestions = questions.map((q, idx) => ({
      id: q.id,
      article_id: id || '',
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      order_index: idx + 1,
      points: q.points,
    }))

    const filledHtml = fillReadingQuizBlanks(contentHtml || contentInput, formattedQuestions)
    handleContentChange(filledHtml)
    showToast({
      type: 'success',
      title: 'Đã điền đáp án đúng',
      message: 'Các ô trống trong bài đọc đã được tự động điền bằng đáp án đúng.',
    })
  }

  const handleBulkQuestionImport = (importedQuestions: ImportedReadingQuestion[]) => {
    const importedAt = Date.now()
    setQuestions((prev) => [
      ...prev,
      ...importedQuestions.map((question, index) => ({
        id: `temp-import-${importedAt}-${index}`,
        question_text: question.questionText,
        question_type: 'multiple_choice' as const,
        options: question.options,
        points: 1,
      })),
    ])
    setBulkImportOpen(false)
    showToast({
      type: 'success',
      title: 'Đã thêm câu hỏi',
      message: `Đã thêm ${importedQuestions.length} câu hỏi vào bài đọc.`,
    })
  }

  const handleQuestionChange = (idx: number, field: keyof LocalQuestion, val: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: val } : q))
    )
  }

  const handleOptionChange = (qIdx: number, optIdx: number, text: string, isCorrect?: boolean) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const newOpts = q.options.map((opt, oi) => {
          if (oi === optIdx) {
            return {
              text: text !== undefined ? text : opt.text,
              is_correct: isCorrect !== undefined ? isCorrect : opt.is_correct,
            }
          }
          // If setting this option as correct, uncheck others for multiple choice
          if (isCorrect && oi !== optIdx) {
            return { ...opt, is_correct: false }
          }
          return opt
        })
        return { ...q, options: newOpts }
      })
    )
  }

  // Generate TTS Audio
  const handleGenerateTts = async () => {
    if (!id) {
      showToast({ type: 'warning', title: 'Lưu bài đọc trước', message: 'Vui lòng lưu bài đọc trước khi tạo audio TTS.' })
      return
    }

    try {
      setGeneratingTts(true)
      const res = await adminReadingService.generateTtsAudio(id)
      setAudioUrl(res.audio_url)
      showToast({ type: 'success', title: 'Đã tạo Audio TTS!', message: 'File audio đã được tạo và lưu trữ trên R2.' })
    } catch (err: any) {
      console.error(err)
      showToast({ type: 'error', title: 'Lỗi tạo Audio TTS', message: err.message || 'Không thể tạo tệp âm thanh phát.' })
    } finally {
      setGeneratingTts(false)
    }
  }

  const handleScanTerms = async () => {
    if (!id) return

    try {
      setScanningTerms(true)
      const count = await adminReadingService.scanArticleTerms(id)
      const terms = await readingService.getArticleTerms(id)
      setMatchedTermCount(count)
      setArticleTerms(terms)
      setEditorMode('preview')
      showToast({
        type: 'success',
        title: 'Đã quét từ vựng',
        message: getReadingVocabularyMatchMessage(count),
      })
    } catch (scanError) {
      console.error(scanError)
      showToast({
        type: 'error',
        title: 'Không thể quét từ vựng',
        message: scanError instanceof Error ? scanError.message : 'Vui lòng thử lại.',
      })
    } finally {
      setScanningTerms(false)
    }
  }

  const annotatedPreviewHtml = useMemo(
    () => annotateReadingHtml(contentHtml, articleTerms),
    [contentHtml, articleTerms]
  )

  const openTermPopover = (marker: HTMLElement) => {
    const termId = marker.dataset.readingTermId
    const term = articleTerms.find((item) => item.global_term_id === termId)
    if (!term) return

    const rect = marker.getBoundingClientRect()
    setSelectedTerm(term)
    setTermPopoverPosition({ x: rect.left, y: rect.bottom })
  }

  const handlePreviewClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-reading-term-id]')
    if (marker) openTermPopover(marker)
  }

  const handlePreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const marker = (event.target as HTMLElement).closest<HTMLElement>('[data-reading-term-id]')
    if (!marker) return
    event.preventDefault()
    openTermPopover(marker)
  }

  // Save Article Handler
  const handleSave = async (publishedState?: boolean) => {
    if (!title.trim() || !contentInput.trim()) {
      setError('Vui lòng nhập tiêu đề và nội dung bài đọc.')
      return
    }

    const topicsArray = topicsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload: CreateArticleInput = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      content_html: contentHtml,
      plain_text: plainText || contentHtml.replace(/<[^>]*>/g, ' ').trim(),
      cefr_level: cefrLevel,
      difficulty,
      topics: topicsArray,
      purpose,
      access_tier: accessTier,
      is_published: publishedState !== undefined ? publishedState : isPublished,
      questions: questions.map((q) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        order_index: 1,
        points: q.points || 1,
      })),
    }

    try {
      setSaving(true)
      setError(null)

      if (isEditing && id) {
        await adminReadingService.updateArticle(id, payload)
        setIsPublished(Boolean(payload.is_published))
        showToast({ type: 'success', title: 'Đã cập nhật bài đọc' })
        if (!payload.is_published) {
          setEditorMode('preview')
          navigate(`/app/admin/reading/${id}/edit?preview=1`, { replace: true })
        }
      } else {
        const created = await adminReadingService.createArticle(payload)
        setIsPublished(created.is_published)
        showToast({ type: 'success', title: 'Đã tạo bài đọc mới' })
        navigate(
          `/app/admin/reading/${created.id}/edit${created.is_published ? '' : '?preview=1'}`,
          { replace: true }
        )
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi lưu bài đọc')
    } finally {
      setSaving(false)
    }
  }

  const wordCount = (plainText || '').trim().split(/\s+/).filter(Boolean).length
  const estReadingTime = Math.max(1, Math.ceil(wordCount / 120))

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          className="neo-button px-3 py-1.5 h-9 bg-white text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl"
        >
          <Link to="/app/admin/reading" className="flex items-center gap-1.5">
            <ArrowLeft size={16} />
            <span>Danh sách bài đọc</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="neo-button px-4 py-2 h-10 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? 'Đang lưu...' : 'Xuất Bản Ngay'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-slate-900 text-rose-900 rounded-xl font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000]">
          {error}
        </div>
      )}

      {/* 1. Basic Info Card */}
      <div className="neo-card p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <h2 className="text-base font-black text-slate-900 border-b-2 border-slate-900 pb-2">
          THÔNG TIN CƠ BẢN BÀI ĐỌC
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Tiêu đề bài đọc *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: The Future of Artificial Intelligence"
              className="w-full p-2.5 text-sm font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Phụ đề (Mô tả ngắn)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="VD: Exploring how AI will transform our world and daily work."
              className="w-full p-2.5 text-xs font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Trình độ CEFR *
            </label>
            <CreatableReadingSelect
              value={cefrLevel}
              onChange={setCefrLevel}
              options={articleOptions.cefr_level}
              onCreate={(name) => handleCreateOption('cefr_level', name, name)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Độ khó *
            </label>
            <CreatableReadingSelect
              value={difficulty}
              onChange={setDifficulty}
              options={articleOptions.difficulty}
              onCreate={(name) => handleCreateOption('difficulty', name, name)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Mục đích học *
            </label>
            <CreatableReadingSelect
              value={purpose}
              onChange={setPurpose}
              options={articleOptions.purpose}
              onCreate={(name) => handleCreateOption('purpose', name, name)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Quyền truy cập (Tier) *
            </label>
            <CreatableReadingSelect
              value={accessTier}
              onChange={setAccessTier}
              options={articleOptions.access_tier}
              onCreate={(name) => handleCreateOption('access_tier', name, name)}
            />
            <p className="mt-1 text-[10px] font-bold text-slate-500">
              Tier tự tạo được xem là nội dung giới hạn, tương đương Pro.
            </p>
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Chủ đề (Phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="Technology, AI, Future"
              className="w-full p-2.5 text-xs font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 2. Rich Text Content Card */}
      <div className="neo-card p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex flex-col gap-3 border-b-2 border-slate-900 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-black text-slate-900">
            NỘI DUNG BÀI ĐỌC
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-3 text-xs font-bold text-slate-600">
              <span>{wordCount} từ</span>
              <span>~{estReadingTime} phút đọc</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleFillCorrectAnswers}
              className="neo-button h-8 min-h-0 px-3 text-xs bg-amber-100 hover:bg-amber-200 text-slate-900 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1.5 cursor-pointer"
              title="Tự động điền các đáp án đúng của câu hỏi bên dưới vào ô trống bài đọc"
            >
              <Sparkles size={14} className="text-amber-800" />
              <span>Điền đáp án đúng</span>
            </Button>
            <Button
              type="button"
              variant={editorMode === 'edit' ? 'secondary' : 'ghost'}
              onClick={() => setEditorMode('edit')}
              className="h-8 min-h-0 px-3 text-xs"
            >
              <Pencil size={14} />
              Soạn thảo
            </Button>
            <Button
              type="button"
              variant={editorMode === 'preview' ? 'secondary' : 'ghost'}
              onClick={() => setEditorMode('preview')}
              className="h-8 min-h-0 px-3 text-xs"
            >
              <Eye size={14} />
              Preview
            </Button>
          </div>
        </div>

        {editorMode === 'edit' ? (
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Soạn thảo nội dung *
            </label>
            <ReadingRichTextEditor
              value={contentInput}
              onChange={handleContentChange}
            />
            <p className="mt-2 text-[11px] font-bold text-slate-600">
              Dán văn bản trực tiếp, chọn cách giữ định dạng rồi dùng thanh công cụ để
              trình bày và tạo bảng. Nội dung cho TTS và thời gian đọc được tạo tự động.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-slate-900 bg-amber-50/40 p-5">
            {contentHtml ? (
              <div
                onClick={handlePreviewClick}
                onKeyDown={handlePreviewKeyDown}
                className="prose max-w-none select-text font-serif text-base leading-relaxed text-slate-900"
                dangerouslySetInnerHTML={{ __html: annotatedPreviewHtml }}
              />
            ) : (
              <p className="py-8 text-center text-sm font-bold text-slate-500">
                Chưa có nội dung để xem trước.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-3 border-t-2 border-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {audioUrl ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border-2 border-slate-900 rounded-xl text-xs font-black text-emerald-950 shadow-[2px_2px_0px_0px_#000]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Audio TTS đã sẵn sàng
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border-2 border-slate-900 rounded-xl text-xs font-black text-amber-950 shadow-[2px_2px_0px_0px_#000]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Chưa có Audio TTS
              </span>
            )}

            {matchedTermCount !== null ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 border-2 border-slate-900 rounded-xl text-xs font-black text-purple-950 shadow-[2px_2px_0px_0px_#000]">
                <Sparkles size={14} className="text-purple-700" />
                {getReadingVocabularyMatchMessage(matchedTermCount)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-700 shadow-[2px_2px_0px_0px_#000]">
                Lưu bài để quét từ vựng
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="neo-button h-10 px-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>{saving ? 'Đang lưu...' : 'Lưu Nháp'}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleScanTerms}
              disabled={scanningTerms || !isEditing}
              className="neo-button h-10 px-4 bg-blue-100 hover:bg-blue-200 text-blue-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {scanningTerms ? (
                <div className="w-4 h-4 border-2 border-blue-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ScanSearch size={15} />
              )}
              <span>{scanningTerms ? 'Đang quét...' : 'Quét từ vựng'}</span>
            </Button>

            {audioUrl && <ReadingAudioPreview audioUrl={audioUrl} />}

            <Button
              type="button"
              onClick={handleGenerateTts}
              disabled={generatingTts || !isEditing}
              className="neo-button h-10 px-4 bg-purple-200 hover:bg-purple-300 text-purple-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generatingTts ? (
                <div className="w-4 h-4 border-2 border-purple-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Volume2 size={15} />
              )}
              <span>{generatingTts ? 'Đang tạo Audio...' : 'Tạo Audio TTS'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Quiz Questions Builder */}
      <div className="neo-card p-6 bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <HelpCircle size={18} className="text-amber-600" />
            <span>BỘ CÂU HỎI ĐỌC HIỂU ({questions.length})</span>
          </h2>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkImportOpen(true)}
              className="h-8 px-3 text-xs"
            >
              <ListPlus size={14} />
              <span>Nhập hàng loạt</span>
            </Button>
            <Button
              type="button"
              onClick={handleAddQuestion}
              className="neo-button px-3 py-1.5 h-8 bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm câu hỏi</span>
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="text-center font-bold text-slate-500 py-6">
            Chưa có câu hỏi kiểm tra nào. Bấm "Thêm câu hỏi" để bắt đầu.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="p-4 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-3 shadow-[2px_2px_0px_0px_#000]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700">Câu hỏi {qIdx + 1}</span>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="neo-button p-1 h-7 w-7 min-h-0 bg-rose-500 text-white rounded-lg border border-slate-900"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                      placeholder="Nội dung câu hỏi (ví dụ: What is the main concern...)"
                      className="w-full p-2 text-xs font-bold border-2 border-slate-900 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <Select
                      value={q.question_type}
                      onChange={(val) => handleQuestionChange(qIdx, 'question_type', val)}
                      options={questionTypeOptions}
                    />
                  </div>
                </div>

                {/* Options list */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Các lựa chọn & Đáp án đúng:</span>
                  {q.options?.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={opt.is_correct}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, opt.text, e.target.checked)}
                        className="w-4 h-4 accent-amber-500 border-2 border-slate-900 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + optIdx)}`}
                        className="flex-1 p-1.5 text-xs font-bold border border-slate-900 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTerm && (
        <ReadingVocabularyPopover
          term={selectedTerm}
          position={termPopoverPosition}
          onClose={() => setSelectedTerm(null)}
        />
      )}

      <BulkQuestionImportModal
        open={bulkImportOpen}
        onCancel={() => setBulkImportOpen(false)}
        onImport={handleBulkQuestionImport}
      />
    </div>
  )
}
