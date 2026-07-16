import { useEffect, useState } from 'react'
import { Plus, Headphones, Award, FileAudio } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
import { adminService } from '@/services/supabase/admin.service'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { AccessTierBadge } from '@/components/admin/AccessTierBadge'
import { BulkActionBar } from '@/components/admin/BulkActionBar'
import type { AccessTier } from '@/types/subscription.types'

export default function AdminListeningPage() {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [bulkUpdating, setBulkUpdating] = useState(false)

  // Trạng thái điều hướng phân cấp
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null)
  const [tests, setTests] = useState<any[]>([])
  const [testsLoading, setTestsLoading] = useState(false)

  const [selectedTest, setSelectedTest] = useState<any | null>(null)
  const [parts, setParts] = useState<any[]>([])
  const [partsLoading, setPartsLoading] = useState(false)

  // Trạng thái modal CRUD
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [topicForm, setTopicForm] = useState<any>({})
  const [topicFormError, setTopicFormError] = useState<string | null>(null)
  const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<string | null>(null)

  const [showTestForm, setShowTestForm] = useState(false)
  const [editingTest, setEditingTest] = useState<string | null>(null)
  const [testForm, setTestForm] = useState<any>({})
  const [testFormError, setTestFormError] = useState<string | null>(null)
  const [pendingDeleteTestId, setPendingDeleteTestId] = useState<string | null>(null)

  const [showPartForm, setShowPartForm] = useState(false)
  const [editingPart, setEditingPart] = useState<string | null>(null)
  const [partForm, setPartForm] = useState<any>({})
  const [partFormError, setPartFormError] = useState<string | null>(null)
  const [pendingDeletePartId, setPendingDeletePartId] = useState<string | null>(null)

  const loadTopics = async () => {
    try {
      setLoading(true)
      const data = await adminService.listListeningTopics()
      setTopics(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi khi tải danh sách chủ đề nghe')
    } finally {
      setLoading(false)
    }
  }

  const loadTests = async (topicId: string) => {
    try {
      setTestsLoading(true)
      const data = await adminService.listListeningTests(topicId)
      setTests(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách đề thi')
    } finally {
      setTestsLoading(false)
    }
  }

  const loadParts = async (testId: string) => {
    try {
      setPartsLoading(true)
      const data = await adminService.listListeningParts(testId)
      setParts(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách phần thi')
    } finally {
      setPartsLoading(false)
    }
  }

  useEffect(() => {
    void loadTopics()
  }, [])

  // Xử lý Chọn Topic / Test
  const handleSelectTopic = (topic: any) => {
    setSelectedTopic(topic)
    setSelectedTest(null)
    setParts([])
    void loadTests(topic.id)
  }

  const handleSelectTest = (test: any) => {
    setSelectedTest(test)
    void loadParts(test.id)
  }

  // Topic CRUD
  const handleCreateTopic = () => {
    setEditingTopic(null)
    setTopicForm({
      title: '',
      description: '',
      difficulty: 'intermediate',
      image_url: '',
      order: 1,
      is_published: false,
      access_tier: 'free',
      teaser_config: { enabled: true, type: 'title_only' }
    })
    setTopicFormError(null)
    setShowTopicForm(true)
  }

  const handleEditTopic = (topic: any) => {
    setEditingTopic(topic.id)
    setTopicForm({
      ...topic,
      access_tier: topic.access_tier || 'free',
      teaser_config: topic.teaser_config || { enabled: true, type: 'title_only' }
    })
    setTopicFormError(null)
    setShowTopicForm(true)
  }

  const handleSaveTopic = async () => {
    if (!topicForm.title) {
      setTopicFormError('Vui lòng nhập tiêu đề.')
      return
    }
    try {
      setTopicFormError(null)
      if (editingTopic) {
        const updated = await adminService.updateListeningTopic(editingTopic, topicForm)
        setTopics(prev => prev.map(t => t.id === editingTopic ? updated : t))
        if (selectedTopic?.id === editingTopic) setSelectedTopic(updated)
      } else {
        const created = await adminService.createListeningTopic(topicForm)
        setTopics(prev => [...prev, created])
      }
      setShowTopicForm(false)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu chủ đề')
    }
  }

  const handleToggleAccessTier = async (topicId: string, currentTier: AccessTier) => {
    const newTier: AccessTier = currentTier === 'pro' ? 'free' : 'pro'
    try {
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, access_tier: newTier } : t))
      if (selectedTopic?.id === topicId) setSelectedTopic((prev: any) => prev ? { ...prev, access_tier: newTier } : null)
      await adminService.updateListeningTopic(topicId, { access_tier: newTier })
    } catch (err: any) {
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, access_tier: currentTier } : t))
      if (selectedTopic?.id === topicId) setSelectedTopic((prev: any) => prev ? { ...prev, access_tier: currentTier } : null)
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
      await subscriptionService.bulkUpdateAccessTier('listening_topics', selectedTopicIds, tier)
      setTopics(prev => prev.map(t => selectedTopicIds.includes(t.id) ? { ...t, access_tier: tier } : t))
      if (selectedTopic && selectedTopicIds.includes(selectedTopic.id)) {
        setSelectedTopic((prev: any) => prev ? { ...prev, access_tier: tier } : null)
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

  const handleDeleteTopic = async (id: string) => {
    try {
      await adminService.deleteListeningTopic(id)
      setTopics(prev => prev.filter(t => t.id !== id))
      if (selectedTopic?.id === id) {
        setSelectedTopic(null)
        setSelectedTest(null)
        setTests([])
        setParts([])
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xóa chủ đề')
    } finally {
      setPendingDeleteTopicId(null)
    }
  }

  // Test CRUD
  const handleCreateTest = () => {
    if (!selectedTopic) return
    setEditingTest(null)
    setTestForm({
      topic_id: selectedTopic.id,
      title: '',
      instructions: '',
      order: 1,
    })
    setTestFormError(null)
    setShowTestForm(true)
  }

  const handleEditTest = (test: any) => {
    setEditingTest(test.id)
    setTestForm({ ...test })
    setTestFormError(null)
    setShowTestForm(true)
  }

  const handleSaveTest = async () => {
    if (!testForm.title) {
      setTestFormError('Vui lòng nhập tên đề thi.')
      return
    }
    try {
      setTestFormError(null)
      if (editingTest) {
        const updated = await adminService.updateListeningTest(editingTest, testForm)
        setTests(prev => prev.map(t => t.id === editingTest ? updated : t))
        if (selectedTest?.id === editingTest) setSelectedTest(updated)
      } else {
        const created = await adminService.createListeningTest(testForm)
        setTests(prev => [...prev, created])
      }
      setShowTestForm(false)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu đề thi')
    }
  }

  const handleDeleteTest = async (id: string) => {
    try {
      await adminService.deleteListeningTest(id)
      setTests(prev => prev.filter(t => t.id !== id))
      if (selectedTest?.id === id) {
        setSelectedTest(null)
        setParts([])
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xóa đề thi')
    } finally {
      setPendingDeleteTestId(null)
    }
  }

  // Part CRUD
  const handleCreatePart = () => {
    if (!selectedTest) return
    setEditingPart(null)
    setPartForm({
      test_id: selectedTest.id,
      part_number: 1,
      directions: '',
      audio_url: '',
      image_url: '',
      transcript: '',
      questions: [],
    })
    setPartFormError(null)
    setShowPartForm(true)
  }

  const handleEditPart = (part: any) => {
    setEditingPart(part.id)
    setPartForm({ ...part })
    setPartFormError(null)
    setShowPartForm(true)
  }

  const handleSavePart = async () => {
    if (!partForm.audio_url) {
      setPartFormError('Vui lòng nhập URL âm thanh.')
      return
    }
    try {
      setPartFormError(null)
      const payload = {
        ...partForm,
        part_number: Number(partForm.part_number),
      }
      if (editingPart) {
        const updated = await adminService.updateListeningPart(editingPart, payload)
        setParts(prev => prev.map(p => p.id === editingPart ? updated : p))
      } else {
        const created = await adminService.createListeningPart(payload)
        setParts(prev => [...prev, created])
      }
      setShowPartForm(false)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu phần thi')
    }
  }

  const handleDeletePart = async (id: string) => {
    try {
      await adminService.deleteListeningPart(id)
      setParts(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      setError(err.message || 'Không thể xóa phần thi')
    } finally {
      setPendingDeletePartId(null)
    }
  }

  // Thao tác với câu hỏi trắc nghiệm của Part
  const handleAddQuestion = () => {
    const questions = [...(partForm.questions || [])]
    questions.push({
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      order: questions.length + 1,
      questionText: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: '',
    })
    setPartForm((prev: any) => ({ ...prev, questions }))
  }

  const handleRemoveQuestion = (idx: number) => {
    const questions = [...(partForm.questions || [])]
    questions.splice(idx, 1)
    // Sắp xếp lại order
    questions.forEach((q, i) => q.order = i + 1)
    setPartForm((prev: any) => ({ ...prev, questions }))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">QUẢN LÝ LUYỆN NGHE</h1>
          <p className="text-muted-foreground font-bold">Cơ cấu bài nghe: Chủ đề → Đề thi → Các Part (1,2,3,4) & Trắc nghiệm.</p>
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

      {/* Phân cấp danh sách */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Topics */}
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-sm uppercase text-foreground border-b border-border pb-1.5 flex items-center gap-1.5">
            <Headphones size={16} />
            1. Chủ đề nghe ({topics.length})
          </h3>
          {loading ? (
            <div className="text-center text-xs font-bold text-muted-foreground">Đang tải...</div>
          ) : (
            <div className="flex flex-col gap-2">
              {topics.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTopic(t)}
                  className={`neo-card p-3 border-2 border-border shadow-[2px_2px_0_var(--border)] cursor-pointer text-xs flex justify-between items-center transition-all ${
                    selectedTopic?.id === t.id ? 'bg-muted border-primary translate-x-1 font-black' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.includes(t.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedTopicIds(prev => [...prev, t.id])
                        } else {
                          setSelectedTopicIds(prev => prev.filter(id => id !== t.id))
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-2 border-[#1c293c] text-primary cursor-pointer focus:ring-0"
                    />
                    <span className="font-bold truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <AccessTierBadge
                      tier={t.access_tier || 'free'}
                      onChange={() => handleToggleAccessTier(t.id, t.access_tier || 'free')}
                    />
                    <button onClick={() => handleEditTopic(t)} className="p-1 rounded hover:bg-muted text-[10px] border border-border">Sửa</button>
                    <button onClick={() => setPendingDeleteTopicId(t.id)} className="p-1 rounded hover:bg-rose-100 text-rose-800 text-[10px] border border-border">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Tests */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-border pb-1.5">
            <h3 className="font-black text-sm uppercase text-foreground flex items-center gap-1.5">
              <Award size={16} />
              2. Đề thi ({tests.length})
            </h3>
            {selectedTopic && (
              <button onClick={handleCreateTest} className="text-[10px] font-black underline hover:text-primary">
                + Thêm đề
              </button>
            )}
          </div>
          {!selectedTopic ? (
            <div className="text-center text-xs font-bold text-muted-foreground p-4">Hãy chọn chủ đề ở cột 1</div>
          ) : testsLoading ? (
            <div className="text-center text-xs font-bold text-muted-foreground">Đang tải...</div>
          ) : tests.length === 0 ? (
            <div className="text-center text-xs font-bold text-muted-foreground p-4">Chưa có đề thi.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {tests.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTest(t)}
                  className={`neo-card p-3 border-2 border-border shadow-[2px_2px_0_var(--border)] cursor-pointer text-xs flex justify-between items-center transition-all ${
                    selectedTest?.id === t.id ? 'bg-muted border-primary translate-x-1 font-black' : 'bg-card'
                  }`}
                >
                  <span className="font-bold truncate">{t.title}</span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEditTest(t)} className="p-1 rounded hover:bg-muted text-[10px] border border-border">Sửa</button>
                    <button onClick={() => setPendingDeleteTestId(t.id)} className="p-1 rounded hover:bg-rose-100 text-rose-800 text-[10px] border border-border">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Parts */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-border pb-1.5">
            <h3 className="font-black text-sm uppercase text-foreground flex items-center gap-1.5">
              <FileAudio size={16} />
              3. Phần thi & Audio ({parts.length})
            </h3>
            {selectedTest && (
              <button onClick={handleCreatePart} className="text-[10px] font-black underline hover:text-primary">
                + Thêm Part
              </button>
            )}
          </div>
          {!selectedTest ? (
            <div className="text-center text-xs font-bold text-muted-foreground p-4">Hãy chọn đề thi ở cột 2</div>
          ) : partsLoading ? (
            <div className="text-center text-xs font-bold text-muted-foreground">Đang tải...</div>
          ) : parts.length === 0 ? (
            <div className="text-center text-xs font-bold text-muted-foreground p-4">Chưa có Part nào được tạo.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {parts.map(p => (
                <div
                  key={p.id}
                  className="neo-card p-3 border-2 border-border bg-card shadow-[2px_2px_0_var(--border)] text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-black text-foreground">Part {p.part_number}</span>
                    <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px] mt-0.5">{p.audio_url}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditPart(p)} className="p-1 rounded hover:bg-muted text-[10px] border border-border font-bold">Sửa</button>
                    <button onClick={() => setPendingDeletePartId(p.id)} className="p-1 rounded hover:bg-rose-100 text-rose-800 text-[10px] border border-border font-bold">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form cho Topic */}
      {showTopicForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="neo-card w-full max-w-md p-6 bg-card border-4 border-border shadow-[8px_8px_0_var(--border)] flex flex-col gap-4">
            <h2 className="text-md font-black uppercase text-foreground border-b-2 border-border pb-2">
              {editingTopic ? 'Sửa chủ đề nghe' : 'Tạo chủ đề nghe mới'}
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
                  onChange={e => setTopicForm((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  placeholder="Ví dụ: ETS 2026"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Mô tả (Description)</label>
                <input
                  type="text"
                  value={topicForm.description || ''}
                  onChange={e => setTopicForm((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  placeholder="Ví dụ: Bộ đề thi TOEIC Listening ETS 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Độ khó (Difficulty)</label>
                  <Select
                    value={topicForm.difficulty || 'intermediate'}
                    onChange={difficulty => setTopicForm((prev: any) => ({ ...prev, difficulty }))}
                    options={[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Thứ tự hiển thị (Order)</label>
                  <input
                    type="number"
                    value={topicForm.order || 1}
                    onChange={e => setTopicForm((prev: any) => ({ ...prev, order: Number(e.target.value) }))}
                    className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="topic_is_published"
                  checked={!!topicForm.is_published}
                  onChange={e => setTopicForm((prev: any) => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 rounded border-2 border-border text-primary cursor-pointer focus:ring-0"
                />
                <label htmlFor="topic_is_published" className="text-xs font-black text-foreground cursor-pointer select-none">
                  Phát hành công khai cho học viên (Publish)
                </label>
              </div>

              <div className="border-t border-border/40 my-1 pt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Phân quyền truy cập (Access Tier)</label>
                  <Select
                    value={topicForm.access_tier || 'free'}
                    onChange={access_tier => setTopicForm((prev: any) => ({ ...prev, access_tier }))}
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
                        onChange={e => setTopicForm((prev: any) => ({
                          ...prev,
                          teaser_config: {
                            ...prev.teaser_config,
                            enabled: e.target.checked
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
                          value={topicForm.teaser_config?.type || 'title_only'}
                          onChange={type => setTopicForm((prev: any) => ({
                            ...prev,
                            teaser_config: {
                              ...prev.teaser_config,
                              type
                            }
                          }))}
                          options={[
                            { value: 'title_only', label: 'Chỉ hiện tiêu đề & mô tả' },
                            { value: 'audio_preview', label: 'Nghe thử 30 giây đầu' },
                            { value: 'transcript_preview', label: 'Hiển thị transcript đoạn đầu' },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-border pt-4">
              <button onClick={() => setShowTopicForm(false)} className="neo-button min-h-0 px-3 py-2 rounded bg-card border-2 border-border text-xs font-black hover:bg-muted active:neo-button-active">Hủy</button>
              <button onClick={handleSaveTopic} className="neo-button min-h-0 px-3 py-2 rounded bg-secondary text-secondary-foreground border-2 border-border text-xs font-black hover:bg-[#321fb0] active:neo-button-active">Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form cho Test */}
      {showTestForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="neo-card w-full max-w-md p-6 bg-card border-4 border-border shadow-[8px_8px_0_var(--border)] flex flex-col gap-4">
            <h2 className="text-md font-black uppercase text-foreground border-b-2 border-border pb-2">
              {editingTest ? 'Sửa đề thi nghe' : 'Tạo đề thi nghe mới'}
            </h2>
            <div className="flex flex-col gap-3">
              {testFormError && (
                <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-xs">
                  {testFormError}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Tên đề thi *</label>
                <input
                  type="text"
                  value={testForm.title || ''}
                  onChange={e => setTestForm((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card"
                  placeholder="Ví dụ: Test 1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-foreground">Hướng dẫn (Instructions)</label>
                <input
                  type="text"
                  value={testForm.instructions || ''}
                  onChange={e => setTestForm((prev: any) => ({ ...prev, instructions: e.target.value }))}
                  className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card"
                />
              </div>
              <div className="flex flex-col gap-1 w-1/2">
                <label className="text-xs font-black text-foreground">Thứ tự hiển thị (Order)</label>
                <input
                  type="number"
                  value={testForm.order || 1}
                  onChange={e => setTestForm((prev: any) => ({ ...prev, order: Number(e.target.value) }))}
                  className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary focus:bg-card"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-border pt-4">
              <button onClick={() => setShowTestForm(false)} className="neo-button min-h-0 px-3 py-2 rounded bg-card border-2 border-border text-xs font-black hover:bg-muted">Hủy</button>
              <button onClick={handleSaveTest} className="neo-button min-h-0 px-3 py-2 rounded bg-secondary text-secondary-foreground border-2 border-border text-xs font-black">Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form cho Part (Lớn) */}
      {showPartForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="neo-card w-full max-w-2xl p-6 bg-card border-4 border-border shadow-[8px_8px_0_var(--border)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-md font-black uppercase text-foreground border-b-2 border-border pb-2">
              {editingPart ? 'Sửa phần nghe Part' : 'Tạo phần nghe Part mới'}
            </h2>
            {partFormError && (
              <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-xs">
                {partFormError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Form: Metadata */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-black text-foreground">Số thứ tự Part *</label>
                    <Select
                      value={String(partForm.part_number || 1)}
                      onChange={part_number => setPartForm((prev: any) => ({ ...prev, part_number: Number(part_number) }))}
                      options={[
                        { value: '1', label: 'Part 1' },
                        { value: '2', label: 'Part 2' },
                        { value: '3', label: 'Part 3' },
                        { value: '4', label: 'Part 4' },
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-black text-foreground">Đường dẫn Audio URL *</label>
                    <input
                      type="text"
                      value={partForm.audio_url || ''}
                      onChange={e => setPartForm((prev: any) => ({ ...prev, audio_url: e.target.value }))}
                      className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary"
                      placeholder="/audio/...mp3"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Đường dẫn Hình ảnh (Part 1)</label>
                  <input
                    type="text"
                    value={partForm.image_url || ''}
                    onChange={e => setPartForm((prev: any) => ({ ...prev, image_url: e.target.value }))}
                    className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Chỉ dẫn (Directions)</label>
                  <textarea
                    rows={2}
                    value={partForm.directions || ''}
                    onChange={e => setPartForm((prev: any) => ({ ...prev, directions: e.target.value }))}
                    className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-foreground">Transcript hội thoại / bài nghe</label>
                  <textarea
                    rows={4}
                    value={partForm.transcript || ''}
                    onChange={e => setPartForm((prev: any) => ({ ...prev, transcript: e.target.value }))}
                    className="px-3 py-1.5 border-2 border-border rounded bg-muted text-xs font-bold focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Right Form: Questions JSON */}
              <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto border border-border/40 p-3 rounded bg-slate-50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-foreground">Danh sách câu hỏi trắc nghiệm</label>
                  <button onClick={handleAddQuestion} className="text-[10px] font-black px-2 py-1 bg-primary border-2 border-border rounded">
                    + Thêm câu hỏi
                  </button>
                </div>

                {(partForm.questions || []).map((q: any, idx: number) => (
                  <div key={q.id} className="p-3 border border-border rounded bg-card flex flex-col gap-2 relative">
                    <button
                      onClick={() => handleRemoveQuestion(idx)}
                      className="absolute top-2 right-2 text-rose-700 hover:text-rose-900 font-bold text-xs"
                    >
                      Xóa
                    </button>
                    <span className="text-[10px] font-black text-muted-foreground">CÂU HỎI {idx + 1}</span>

                    <input
                      type="text"
                      value={q.questionText}
                      onChange={e => {
                        const questions = [...partForm.questions]
                        questions[idx].questionText = e.target.value
                        setPartForm((prev: any) => ({ ...prev, questions }))
                      }}
                      className="px-2 py-1 border border-border rounded text-xs font-bold"
                      placeholder="Nhập đề bài..."
                    />

                    {/* 4 Options */}
                    <div className="flex flex-col gap-1">
                      {q.options.map((opt: string, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-1">
                          <span className="text-[10px] font-black w-3">{String.fromCharCode(65 + optIdx)}:</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => {
                              const questions = [...partForm.questions]
                              questions[idx].options[optIdx] = e.target.value
                              setPartForm((prev: any) => ({ ...prev, questions }))
                            }}
                            className="flex-1 px-2 py-0.5 border border-border rounded text-[11px]"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-black">Đáp án đúng</label>
                        <Select
                          value={String(q.correctIndex)}
                          onChange={correctIndex => {
                            const questions = [...partForm.questions]
                            questions[idx].correctIndex = Number(correctIndex)
                            setPartForm((prev: any) => ({ ...prev, questions }))
                          }}
                          options={[
                            { value: '0', label: 'A' },
                            { value: '1', label: 'B' },
                            { value: '2', label: 'C' },
                            { value: '3', label: 'D' },
                          ]}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-black">Giải thích</label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={e => {
                            const questions = [...partForm.questions]
                            questions[idx].explanation = e.target.value
                            setPartForm((prev: any) => ({ ...prev, questions }))
                          }}
                          className="px-2 py-1 border border-border rounded text-xs"
                          placeholder="Vì sao..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t-2 border-border pt-4 mt-2">
              <button onClick={() => setShowPartForm(false)} className="neo-button min-h-0 px-4 py-2 rounded bg-card border-2 border-border text-xs font-black">Hủy</button>
              <button onClick={handleSavePart} className="neo-button min-h-0 px-4 py-2 rounded bg-secondary text-secondary-foreground border-2 border-border text-xs font-black">Lưu lại</button>
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
        title="Xóa chủ đề nghe?"
        description="Chủ đề này cùng toàn bộ đề thi và phần nghe liên quan sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmLabel="Xóa chủ đề"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => pendingDeleteTopicId && handleDeleteTopic(pendingDeleteTopicId)}
        onCancel={() => setPendingDeleteTopicId(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteTestId}
        title="Xóa đề thi nghe?"
        description="Đề thi này cùng toàn bộ phần nghe và câu hỏi liên quan sẽ bị xóa."
        confirmLabel="Xóa đề thi"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => pendingDeleteTestId && handleDeleteTest(pendingDeleteTestId)}
        onCancel={() => setPendingDeleteTestId(null)}
      />

      <ConfirmModal
        open={!!pendingDeletePartId}
        title="Xóa phần thi?"
        description="Phần nghe này sẽ bị xóa khỏi đề thi hiện tại."
        confirmLabel="Xóa phần thi"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => pendingDeletePartId && handleDeletePart(pendingDeletePartId)}
        onCancel={() => setPendingDeletePartId(null)}
      />
    </div>
  )
}
