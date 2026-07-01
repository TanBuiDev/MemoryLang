import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminService } from '@/services/supabase/admin.service'
import type { LessonBlock, BlockType } from '@/types/grammar.types'
import { BLOCK_TYPE_LABELS } from '@/types/grammar.types'
import { AppLoading } from '@/components/common/AppLoading'
import { Badge } from '@/components/ui/badge'

const INITIAL_CONTENT: Record<BlockType, Record<string, unknown>> = {
  heading: { text: '', level: 2, icon: '' },
  paragraph: { html: '' },
  table: { headers: [''], rows: [['']], caption: '' },
  code: { text: '', language: '' },
  callout: { variant: 'info', title: '', html: '' },
  example_list: { items: [{ text: '', correct: true }] },
  exercise_group: {
    instruction: '',
    questions: [{ id: crypto.randomUUID(), question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }]
  },
  summary: { variant: 'bullet', items: [''] },
  divider: {},
}

export default function AdminGrammarLessonEditPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const [blocks, setBlocks] = useState<LessonBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<LessonBlock | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [addingType, setAddingType] = useState<BlockType | null>(null)

  const loadBlocks = useCallback(async () => {
    if (!topicId) return
    try {
      setError(null)
      const data = await adminService.listLessonBlocks(topicId)
      setBlocks(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loi tai du lieu')
    } finally {
      setLoading(false)
    }
  }, [topicId])

  useEffect(() => { loadBlocks() }, [loadBlocks])

  const handleAdd = async () => {
    if (!topicId || !addingType) return
    try {
      const block = await adminService.createLessonBlock({
        topic_id: topicId,
        sort_order: blocks.length,
        block_type: addingType,
        content: INITIAL_CONTENT[addingType],
      })
      setBlocks((prev) => [...prev, block])
      setAddingType(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loi them block')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await adminService.deleteLessonBlock(id)
      setBlocks((prev) => {
        const filtered = prev.filter((b) => b.id !== id)
        return filtered.map((b, i) => ({ ...b, sort_order: i }))
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loi xoa block')
    }
  }

  const handleEdit = (block: LessonBlock) => {
    setEditingBlock(block)
    setEditContent(JSON.stringify(block.content, null, 2))
  }

  const handleSaveEdit = async () => {
    if (!editingBlock) return
    try {
      let content: Record<string, unknown>
      try {
        content = JSON.parse(editContent)
      } catch {
        setError('JSON khong hop le')
        return
      }

      const updated = await adminService.updateLessonBlock(editingBlock.id, { content })
      setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      setEditingBlock(null)
      setEditContent('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loi luu block')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const newBlocks = [...blocks]
    ;[newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]
    const ordered = newBlocks.map((b, i) => ({ ...b, sort_order: i }))
    setBlocks(ordered)
    try {
      await adminService.reorderLessonBlocks(topicId!, ordered.map((b) => b.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loi sap xep')
      loadBlocks()
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index >= blocks.length - 1) return
    const newBlocks = [...blocks]
    ;[newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]]
    const ordered = newBlocks.map((b, i) => ({ ...b, sort_order: i }))
    setBlocks(ordered)
    try {
      await adminService.reorderLessonBlocks(topicId!, ordered.map((b) => b.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loi sap xep')
      loadBlocks()
    }
  }

  if (loading) return <AppLoading />

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/app/admin/grammar"
          className="text-sm text-purple-600 hover:text-purple-800 font-bold"
        >
          Quay lai danh sach chu de
        </Link>
        <span className="text-sm text-gray-500">{blocks.length} blocks</span>
      </div>

      {error && (
        <div className="p-3 border-2 border-red-400 bg-red-50 rounded-lg text-red-800 text-sm font-semibold">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dong</button>
        </div>
      )}

      {/* Add block dropdown */}
      <div className="flex gap-3 items-center">
        <select
          value={addingType ?? ''}
          onChange={(e) => setAddingType((e.target.value || null) as BlockType | null)}
          className="border-2 border-(--border) rounded-lg px-3 py-2 text-sm font-semibold bg-white"
        >
          <option value="">+ Them block...</option>
          {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(([type, label]) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>
        {addingType && (
          <button
            onClick={handleAdd}
            className="neo-button px-4 py-2 text-sm font-bold"
          >
            Them
          </button>
        )}
      </div>

      {/* Block list */}
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="neo-card p-4 flex items-center gap-3"
          >
            {/* Up/Down buttons */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-xs px-2 py-0.5 border border-(--border) rounded hover:bg-gray-100 disabled:opacity-30"
              >
                Up
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index >= blocks.length - 1}
                className="text-xs px-2 py-0.5 border border-(--border) rounded hover:bg-gray-100 disabled:opacity-30"
              >
                Down
              </button>
            </div>

            {/* Block info */}
            <div className="flex-1 min-w-0">
              <Badge className="bg-purple-100 text-purple-800 text-xs mb-1">
                {BLOCK_TYPE_LABELS[block.block_type as BlockType] ?? block.block_type}
              </Badge>
              <p className="text-xs text-gray-500 truncate">
                {JSON.stringify(block.content).slice(0, 100)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleEdit(block)}
                className="text-xs px-3 py-1.5 border-2 border-(--border) rounded-lg bg-white font-bold hover:bg-purple-50"
              >
                Sua
              </button>
              <button
                onClick={() => handleDelete(block.id)}
                className="text-xs px-3 py-1.5 border-2 border-red-400 rounded-lg bg-white font-bold text-red-600 hover:bg-red-50"
              >
                Xoa
              </button>
            </div>
          </div>
        ))}

        {blocks.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500 font-semibold">
            Chua co block nao. Chon loai block va nhan "Them" de bat dau.
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="neo-card p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              Sua block: {BLOCK_TYPE_LABELS[editingBlock.block_type as BlockType]}
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              Chinh sua noi dung JSON ben duoi
            </p>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 border-2 border-(--border) rounded-lg p-3 text-sm font-mono"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setEditingBlock(null); setEditContent('') }}
                className="px-4 py-2 text-sm font-bold border-2 border-(--border) rounded-lg bg-white"
              >
                Huy
              </button>
              <button
                onClick={handleSaveEdit}
                className="neo-button px-4 py-2 text-sm font-bold"
              >
                Luu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
