import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit3, Eye, CheckCircle2, ChevronRight, BookOpen, AlertCircle } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
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

  const [editingExercise, setEditingExercise] = useState<string | null>(null)
  const [exerciseForm, setExerciseForm] = useState<Partial<GrammarExercise>>({
    options: ['', '', '', ''],
  })
  const [showExerciseForm, setShowExerciseForm] = useState(false)

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
      alert('Không thể tải danh sách bài tập')
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
    })
    setShowTopicForm(true)
  }

  const handleEditTopic = (topic: GrammarTopic) => {
    setEditingTopic(topic.id)
    setTopicForm({ ...topic })
    setShowTopicForm(true)
  }

  const handleDeleteTopic = async (id: string) => {
    if (!window.confirm('Xóa chủ đề ngữ pháp này sẽ xóa toàn bộ bài tập liên quan. Bạn có chắc chắn?')) return
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
    }
  }

  const handleSaveTopic = async () => {
    if (!topicForm.title || !topicForm.category || !topicForm.explanation) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    try {
      setError(null)
      const examples = (topicForm.examples ?? []).filter(ex => ex.sentence.trim() !== '')

      const payload = {
        title: topicForm.title,
        category: topicForm.category,
        level: topicForm.level || 'intermediate',
        explanation: topicForm.explanation,
        examples,
        is_published: !!topicForm.is_published,
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
      alert('Không thể thay đổi trạng thái phát hành')
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
    setShowExerciseForm(true)
  }

  const handleEditExercise = (exercise: GrammarExercise) => {
    setEditingExercise(exercise.id)
    setExerciseForm({ ...exercise })
    setShowExerciseForm(true)
  }

  const handleDeleteExercise = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tập này?')) return
    try {
      await adminService.deleteGrammarExercise(id)
      setExercises(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      console.error(err)
      alert('Không thể xóa bài tập')
    }
  }

  const handleSaveExercise = async () => {
    if (!exerciseForm.question || !exerciseForm.answer) {
      alert('Vui lòng nhập câu hỏi và câu trả lời chính xác')
      return
    }

    try {
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
      alert('Lỗi khi lưu bài tập')
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-foreground truncate">{topic.title}</h3>
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
                    <button
                      onClick={() => handleEditTopic(topic)}
                      className="p-1.5 rounded border border-border bg-card hover:bg-muted text-foreground transition-all"
                      title="Sửa chủ đề"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(topic.id)}
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
                        onClick={() => handleDeleteExercise(ex.id)}
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
                  <select
                    value={topicForm.category || 'Verb Patterns'}
                    onChange={e => setTopicForm(prev => ({ ...prev, category: e.target.value }))}
                    className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  >
                    <option value="Verb Patterns">Verb Patterns</option>
                    <option value="Connectors">Connectors</option>
                    <option value="Sentence Structure">Sentence Structure</option>
                    <option value="Prepositions">Prepositions</option>
                    <option value="Adjective Phrases">Adjective Phrases</option>
                    <option value="Adverbs">Adverbs</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Cấp độ (Level)</label>
                  <select
                    value={topicForm.level || 'intermediate'}
                    onChange={e => setTopicForm(prev => ({ ...prev, level: e.target.value }))}
                    className="px-3 py-2 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
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
    </div>
  )
}
