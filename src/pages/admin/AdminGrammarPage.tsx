import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit3, Eye, CheckCircle2, ChevronRight, BookOpen, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { adminService } from '@/services/supabase/admin.service'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { AccessTierBadge } from '@/components/admin/AccessTierBadge'
import { BulkActionBar } from '@/components/admin/BulkActionBar'
import type { AccessTier } from '@/types/subscription.types'
import type { GrammarTopic, GrammarExercise } from '@/types/admin.types'

export default function AdminGrammarPage() {
  const [topics, setTopics] = useState<GrammarTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quản lý trạng thái đang chọn chủ đề để xem bài tập
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(null)
  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(false)

  // Trạng thái modal/form thêm/sửa
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [topicForm, setTopicForm] = useState<Partial<GrammarTopic>>({})
  const [showTopicForm, setShowTopicForm] = useState(false)

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<string | null>(null)
  const [topicFormError, setTopicFormError] = useState<string | null>(null)

  const [editingExercise, setEditingExercise] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState<Partial<GrammarExercise>>({
    options: ['', '', '', ''],
  })
  const [showExerciseForm, setShowExerciseForm] = useState(false)
  const [pendingDeleteExerciseId, setPendingDeleteExerciseId] = useState<string | null>(null)
  const [exerciseFormError, setExerciseFormError] = useState<string | null>(null)

  const loadTopics = async () => {
    try {
      setLoading(true)
      const data = await adminService.listGrammarTopics()
      setTopics(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi tải danh sách chủ đề ngữ pháp')
    } finally {
      setLoading(false)
    }
  }

  const loadExercises = async (topicId: string) => {
    try {
      setExercisesLoading(true)
      const data = await adminService.listGrammarExercises(topicId)
      setExercises(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách bài tập')
    } finally {
      setExercisesLoading(false)
    }
  }

  useEffect(() => {
    void loadTopics()
  }, [])

  const handleSelectTopic = (topic: GrammarTopic) => {
    setSelectedTopic(topic)
    void loadExercises(topic.id)
  }

  // Xử lý CRUD Topic
  const handleCreateTopic = () => {
    setEditingTopic(null)
    setTopicForm({
      title: '',
      category: 'Verb Patterns',
      level: 'intermediate',
      explanation: '',
      examples: [{ sentence: '', translation: '' }],
      is_published: false,
      access_tier: 'free',
      teaser_config: { enabled: true, type: 'theory_only' },
    })
    setTopicFormError(null)
    setShowTopicForm(true)
  }

  const handleEditTopic = (topic: GrammarTopic) => {
    setEditingTopic(topic.id)
    setTopicForm({
      ...topic,
      access_tier: topic.access_tier || 'free',
      teaser_config: topic.teaser_config || { enabled: true, type: 'theory_only' },
    })
    setTopicFormError(null)
    setShowTopicForm(true)
  }

  const handleDeleteTopic = async (id: string) => {
    try {
      setError(null)
      await adminService.deleteGrammarTopic(id)
      setTopics(prev => prev.filter(t => t.id !== id))
      if (selectedTopic?.id === id) {
        setSelectedTopic(null)
        setExercises([])
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi xóa chủ đề ngữ pháp')
    } finally {
      setPendingDeleteTopicId(null)
    }
  }

  const handleSaveTopic = async () => {
    if (!topicForm.title || !topicForm.category || !topicForm.explanation) {
      setTopicFormError('Vui lòng điền đầy đủ thông tin bắt buộc.')
      return
    }

    try {
      setError(null)
      setTopicFormError(null)
      const examples = (topicForm.examples ?? []).filter(ex => ex.sentence.trim() !== '')

      const payload = {
        title: topicForm.title!,
        category: topicForm.category!,
        level: topicForm.level || 'intermediate',
        explanation: topicForm.explanation!,
        examples,
        is_published: !!topicForm.is_published,
        access_tier: topicForm.access_tier || 'free',
        teaser_config: topicForm.teaser_config || { enabled: true, type: 'theory_only' },
      }

      if (editingTopic) {
        const updated = await adminService.updateGrammarTopic(editingTopic, payload)
        setTopics(prev => prev.map(t => t.id === editingTopic ? updated : t))
        if (selectedTopic?.id === editingTopic) {
          setSelectedTopic(updated)
        }
      } else {
        const created = await adminService.createGrammarTopic(payload)
        setTopics(prev => [created, ...prev])
      }
      setShowTopicForm(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi lưu chủ đề ngữ pháp')
    }
  }

  const handleToggleAccessTier = async (topicId: string, currentTier: AccessTier) => {
    const newTier: AccessTier = currentTier === 'pro' ? 'free' : 'pro'
    try {
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, access_tier: newTier } : t))
      if (selectedTopic?.id === topicId) setSelectedTopic(prev => prev ? { ...prev, access_tier: newTier } : null)
      await adminService.updateGrammarTopic(topicId, { access_tier: newTier })
    } catch (err: any) {
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, access_tier: currentTier } : t))
      if (selectedTopic?.id === topicId) setSelectedTopic(prev => prev ? { ...prev, access_tier: currentTier } : null)
      showToast({
        type: 'error',
        title: 'Không thể thay đổi phân quyền',
        message: err.message,
      })
    }
  }

  const handleBulkUpdateAccessTier = async (tier: AccessTier) => {
    try {
      setBulkUpdating(true)
      await subscriptionService.bulkUpdateAccessTier('grammar_topics', selectedTopicIds, tier)
      setTopics(prev => prev.map(t => selectedTopicIds.includes(t.id) ? { ...t, access_tier: tier } : t))
      if (selectedTopic && selectedTopicIds.includes(selectedTopic.id)) {
        setSelectedTopic(prev => prev ? { ...prev, access_tier: tier } : null)
      }
      setSelectedTopicIds([])
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi thao tác hàng loạt',
        message: err.message,
      })
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleTogglePublishTopic = async (topic: GrammarTopic) => {
    try {
      const updated = await adminService.updateGrammarTopic(topic.id, {
        is_published: !topic.is_published,
      })
      setTopics(prev => prev.map(t => t.id === topic.id ? updated : t))
      if (selectedTopic?.id === topic.id) {
        setSelectedTopic(updated)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể thay đổi trạng thái phát hành')
    }
  }

  // Xử lý CRUD Exercise
  const handleCreateExercise = () => {
    if (!selectedTopic) return
    setEditingExercise(null)
    setExerciseForm({
      topic_id: selectedTopic.id,
      question: '',
      options: ['', '', '', ''],
      answer: '',
      explanation: '',
    })
    setExerciseFormError(null)
    setShowExerciseForm(true)
  }

  const handleEditExercise = (exercise: GrammarExercise) => {
    setEditingExercise(exercise.id)
    setExerciseForm({ ...exercise })
    setExerciseFormError(null)
    setShowExerciseForm(true)
  }

  const handleDeleteExercise = async (id: string) => {
    try {
      await adminService.deleteGrammarExercise(id)
      setExercises(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể xóa bài tập')
    } finally {
      setPendingDeleteExerciseId(null)
    }
  }

  const handleSaveExercise = async () => {
    if (!exerciseForm.question || !exerciseForm.answer) {
      setExerciseFormError('Vui lòng nhập câu hỏi và câu trả lời chính xác.')
      return
    }

    try {
      setExerciseFormError(null)
      const payload = {
        topic_id: selectedTopic!.id,
        question: exerciseForm.question,
        options: exerciseForm.options || [],
        answer: exerciseForm.answer,
        explanation: exerciseForm.explanation || '',
      }

      if (editingExercise) {
        const updated = await adminService.updateGrammarExercise(editingExercise, payload)
        setExercises(prev => prev.map(e => e.id === editingExercise ? updated : e))
      } else {
        const created = await adminService.createGrammarExercise(payload)
        setExercises(prev => [...prev, created])
      }
      setShowExerciseForm(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi lưu bài tập')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">QUẢN LÝ NGỮ PHÁP</h1>
          <p className="text-muted-foreground font-bold">Quản lý chủ đề và bài tập ngữ pháp thực tế.</p>
        </div>
        <button
          onClick={handleCreateTopic}
          className="neo-button min-h-0 px-4 py-2 rounded-md border-2 border-border bg-[#fdc800] text-foreground text-xs font-black flex items-center gap-1.5 hover:bg-[#e0b000] active:neo-button-active transition-all"
        >
          <Plus size={16} />
          Thêm chủ đề
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
          {error}
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Topics List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-md font-black border-b-2 border-border pb-2 text-foreground flex items-center gap-1.5">
            <BookOpen size={18} />
            CHỦ ĐỀ NGỮ PHÁP (TOPICS)
          </h2>

          {loading ? (
            <div className="text-center font-bold text-muted-foreground py-6">Đang tải chủ đề...</div>
          ) : topics.length === 0 ? (
            <div className="text-center font-bold text-muted-foreground py-6">Chưa có chủ đề nào được tạo.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] transition-all flex justify-between items-start gap-3 cursor-pointer ${
                    selectedTopic?.id === topic.id ? 'bg-muted border-primary translate-x-1' : ''
                  }`}
                  onClick={() => handleSelectTopic(topic)}
                >
                  <div className="flex items-center gap-2 shrink-0 self-start mt-0.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.includes(topic.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedTopicIds(prev => [...prev, topic.id])
                        } else {
                          setSelectedTopicIds(prev => prev.filter(id => id !== topic.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-2 border-[#1c293c] text-primary cursor-pointer focus:ring-0"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-sm text-foreground truncate">{topic.title}</h3>
                      <AccessTierBadge
                        tier={topic.access_tier || 'free'}
                        onChange={() => handleToggleAccessTier(topic.id, topic.access_tier || 'free')}
                      />
                      {topic.is_published ? (
                        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-300 text-[10px] font-black uppercase">
                          PUBLISHED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-300 text-[10px] font-black uppercase">
                          DRAFT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Phân loại: {topic.category} | Cấp độ: {topic.level}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{topic.explanation}</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleTogglePublishTopic(topic)}
                      className={`p-1.5 rounded border border-border bg-card hover:bg-muted transition-all`}
                      title={topic.is_published ? 'Hạ xuống bản nháp' : 'Phát hành ngay'}
                    >
                      <Eye size={12} className={topic.is_published ? 'text-primary' : 'text-muted-foreground'} />
                    </button>
                    <Link
                      to={`/app/admin/grammar/${topic.id}`}
                      className="text-xs px-3 py-1.5 border-2 border-purple-400 rounded-lg bg-purple-50 font-bold text-purple-600 hover:bg-purple-100"
                    >
                      Blocks
                    </Link>
                    <button
                      onClick={() => handleEditTopic(topic)}
                      className="p-1.5 rounded border border-border bg-card hover:bg-muted text-foreground transition-all"
                      title="Sửa chủ đề"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => setPendingDeleteTopicId(topic.id)}
                      className="p-1.5 rounded border border-border bg-rose-50 text-rose-800 hover:bg-rose-100 transition-all"
                      title="Xóa chủ đề"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ChevronRight size={16} className="text-muted-foreground ml-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Exercises list for selected Topic */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b-2 border-border pb-2">
            <h2 className="text-md font-black text-foreground flex items-center gap-1.5">
              <CheckCircle2 size={18} />
              BÀI TẬP TRẮC NGHIỆM
            </h2>
            {selectedTopic && (
              <button
                onClick={handleCreateExercise}
                className="neo-button min-h-0 px-2.5 py-1.5 rounded bg-secondary text-secondary-foreground text-xs font-black border-2 border-border shadow-[2px_2px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#321fb0] transition-all flex items-center gap-1"
              >
                <Plus size={12} />
                Thêm bài tập
              </button>
            )}
          </div>

          {!selectedTopic ? (
            <div className="neo-card p-6 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col items-center justify-center text-center text-muted-foreground min-h-[300px]">
              <AlertCircle size={32} className="mb-2" />
              <p className="font-bold">Chọn một chủ đề ngữ pháp bên trái để xem và quản lý bài tập thực hành.</p>
            </div>
          ) : exercisesLoading ? (
            <div className="text-center font-bold text-muted-foreground py-10">Đang tải bài tập...</div>
          ) : exercises.length === 0 ? (
            <div className="neo-card p-6 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col items-center justify-center text-center text-muted-foreground min-h-[300px]">
              <Plus size={32} className="mb-2 text-primary cursor-pointer hover:scale-115 transition-transform" onClick={handleCreateExercise} />
              <p className="font-bold">Chủ đề này chưa có bài tập nào. Hãy nhấn "Thêm bài tập" để tạo câu hỏi trắc nghiệm mới.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="neo-card p-4 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-muted-foreground uppercase">Câu hỏi {idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditExercise(ex)}
                        className="p-1 rounded border border-border bg-card hover:bg-muted text-foreground transition-all"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => setPendingDeleteExerciseId(ex.id)}
                        className="p-1 rounded border border-border bg-rose-50 text-rose-800 hover:bg-rose-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground">{ex.question}</p>
                  
                  {/* Options */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {ex.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`px-3 py-1.5 border rounded text-xs font-semibold ${
                          opt === ex.answer
                            ? 'bg-green-50 border-green-400 text-green-800 font-bold'
                            : 'bg-muted border-border/40 text-muted-foreground'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </div>
                    ))}
                  </div>

                  {ex.explanation && (
                    <p className="text-xs bg-slate-50 border border-slate-200 p-2 rounded text-muted-foreground mt-1">
                      <span className="font-black text-foreground">Giải thích:</span> {ex.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Dialog/Box cho Topic */}
      {showTopicForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="neo-card w-full max-w-lg p-6 bg-card border-4 border-border shadow-[8px_8px_0_var(--border)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black uppercase text-foreground border-b-2 border-border pb-2">
              {editingTopic ? 'Sửa chủ đề ngữ pháp' : 'Tạo chủ đề ngữ pháp mới'}
            </h2>

            <div className="flex flex-col gap-3">
              {topicFormError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-xs">
                  {topicFormError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Tiêu đề (Title) *</label>
                <input
                  type="text"
                  value={topicForm.title || ''}
                  onChange={e => setTopicForm(prev => ({ ...prev, title: e.target.value }))}
                  className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  placeholder="Ví dụ: Used to + V"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Phân loại (Category) *</label>
                  <Select
                    value={topicForm.category || 'Verb Patterns'}
                    onChange={category => setTopicForm(prev => ({ ...prev, category }))}
                    options={[
                      { value: 'Verb Patterns', label: 'Verb Patterns' },
                      { value: 'Connectors', label: 'Connectors' },
                      { value: 'Sentence Structure', label: 'Sentence Structure' },
                      { value: 'Prepositions', label: 'Prepositions' },
                      { value: 'Adjective Phrases', label: 'Adjective Phrases' },
                      { value: 'Adverbs', label: 'Adverbs' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Cấp độ (Level)</label>
                  <Select
                    value={topicForm.level || 'intermediate'}
                    onChange={level => setTopicForm(prev => ({ ...prev, level }))}
                    options={[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Giải thích lý thuyết *</label>
                <textarea
                  rows={4}
                  value={topicForm.explanation || ''}
                  onChange={e => setTopicForm(prev => ({ ...prev, explanation: e.target.value }))}
                  className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all resize-none"
                  placeholder="Nhập giải thích ngữ nghĩa và cấu trúc..."
                />
              </div>

              {/* Trạng thái phát hành */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={!!topicForm.is_published}
                  onChange={e => setTopicForm(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_published" className="text-xs font-black text-foreground cursor-pointer select-none">
                  Phát hành công khai cho học viên (Publish)
                </label>
              </div>

              <div className="border-t border-border/40 my-1 pt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Phân quyền truy cập (Access Tier)</label>
                  <Select
                    value={topicForm.access_tier || 'free'}
                    onChange={access_tier => setTopicForm(prev => ({ ...prev, access_tier: access_tier as 'free' | 'pro' }))}
                    options={[
                      { value: 'free', label: 'Free (Miễn phí)' },
                      { value: 'pro', label: 'Pro (Trả phí)' },
                    ]}
                  />
                </div>

                {topicForm.access_tier === 'pro' && (
                  <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-border rounded">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="teaser_enabled"
                        checked={topicForm.teaser_config?.enabled !== false}
                        onChange={e => setTopicForm(prev => ({
                          ...prev,
                          teaser_config: {
                            enabled: e.target.checked,
                            type: prev.teaser_config?.type || 'theory_only'
                          }
                        }))}
                        className="w-4 h-4 rounded border-2 border-border text-primary cursor-pointer focus:ring-0"
                      />
                      <label htmlFor="teaser_enabled" className="text-xs font-black text-[#1c293c] cursor-pointer select-none">
                        Cho phép xem trước (Teaser Mode)
                      </label>
                    </div>

                    {topicForm.teaser_config?.enabled !== false && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[11px] font-bold text-muted-foreground">Chế độ hiển thị khi bị khóa</label>
                        <Select
                          value={topicForm.teaser_config?.type || 'theory_only'}
                          onChange={type => setTopicForm(prev => ({
                            ...prev,
                            teaser_config: {
                              enabled: prev.teaser_config?.enabled !== false,
                              type
                            }
                          }))}
                          options={[
                            { value: 'title_only', label: 'Chỉ hiện tiêu đề' },
                            { value: 'theory_only', label: 'Hiển thị lý thuyết, khóa bài tập' },
                            { value: 'partial_exercise', label: 'Cho làm 2 câu hỏi đầu tiên' },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t-2 border-border pt-4 mt-2">
              <button
                onClick={() => setShowTopicForm(false)}
                className="neo-button min-h-0 px-4 py-2 rounded bg-card border-2 border-border text-xs font-black hover:bg-muted active:neo-button-active transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTopic}
                className="neo-button min-h-0 px-4 py-2 rounded bg-secondary text-secondary-foreground border-2 border-border text-xs font-black hover:bg-[#321fb0] active:neo-button-active transition-all"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Dialog/Box cho Exercise */}
      {showExerciseForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="neo-card w-full max-w-lg p-6 bg-card border-4 border-border shadow-[8px_8px_0_var(--border)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black uppercase text-foreground border-b-2 border-border pb-2">
              {editingExercise ? 'Sửa câu hỏi trắc nghiệm' : 'Thêm câu hỏi trắc nghiệm mới'}
            </h2>

            <div className="flex flex-col gap-3">
              {exerciseFormError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-xs">
                  {exerciseFormError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Đề bài (Question) *</label>
                <input
                  type="text"
                  value={exerciseForm.question || ''}
                  onChange={e => setExerciseForm(prev => ({ ...prev, question: e.target.value }))}
                  className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  placeholder="Ví dụ: When I was young, I ________ go swimming."
                />
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-foreground">4 Lựa chọn trả lời *</label>
                {(exerciseForm.options || ['', '', '', '']).map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <span className="text-xs font-black w-4">{String.fromCharCode(65 + optIdx)}:</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...(exerciseForm.options || ['', '', '', ''])]
                        newOpts[optIdx] = e.target.value
                        setExerciseForm(prev => ({ ...prev, options: newOpts }))
                      }}
                      className="flex-1 px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + optIdx)}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Đáp án đúng (Chính xác giá trị chuỗi) *</label>
                <input
                  type="text"
                  value={exerciseForm.answer || ''}
                  onChange={e => setExerciseForm(prev => ({ ...prev, answer: e.target.value }))}
                  className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  placeholder="Nhập giá trị chuỗi trùng khớp chính xác 1 trong 4 phương án"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Giải thích chi tiết</label>
                <textarea
                  rows={2}
                  value={exerciseForm.explanation || ''}
                  onChange={e => setExerciseForm(prev => ({ ...prev, explanation: e.target.value }))}
                  className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all resize-none"
                  placeholder="Nhập giải thích ngữ pháp tại sao lại chọn đáp án đó..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t-2 border-border pt-4 mt-2">
              <button
                onClick={() => setShowExerciseForm(false)}
                className="neo-button min-h-0 px-4 py-2 rounded bg-card border-2 border-border text-xs font-black hover:bg-muted active:neo-button-active transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveExercise}
                className="neo-button min-h-0 px-4 py-2 rounded bg-secondary text-secondary-foreground border-2 border-border text-xs font-black hover:bg-[#321fb0] active:neo-button-active transition-all"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedTopicIds.length}
        onUpdateTier={handleBulkUpdateAccessTier}
        onClearSelection={() => setSelectedTopicIds([])}
        isLoading={bulkUpdating}
      />

      <ConfirmModal
        open={!!pendingDeleteTopicId}
        title="Xóa chủ đề ngữ pháp?"
        description="Chủ đề này và toàn bộ bài tập liên quan sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmLabel="Xóa chủ đề"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => pendingDeleteTopicId && handleDeleteTopic(pendingDeleteTopicId)}
        onCancel={() => setPendingDeleteTopicId(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteExerciseId}
        title="Xóa bài tập?"
        description="Bài tập này sẽ bị xóa khỏi chủ đề hiện tại."
        confirmLabel="Xóa bài tập"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => pendingDeleteExerciseId && handleDeleteExercise(pendingDeleteExerciseId)}
        onCancel={() => setPendingDeleteExerciseId(null)}
      />
    </div>
  )
}
