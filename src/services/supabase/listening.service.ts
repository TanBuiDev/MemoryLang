import { supabase } from '@/services/supabase/client'
import type { ListeningTopic, ListeningTest, ListeningPart, ListeningQuestion } from '@/types/listening.types'

const mapDbTopic = (dbTopic: any): ListeningTopic => ({
  id: dbTopic.id,
  title: dbTopic.title,
  description: dbTopic.description || undefined,
  order: dbTopic.order || 0
})

const mapDbTest = (dbTest: any): ListeningTest => ({
  id: dbTest.id,
  topicId: dbTest.topic_id,
  title: dbTest.title,
  order: dbTest.order || 0
})

const mapDbPart = (dbPart: any): ListeningPart => ({
  id: dbPart.id,
  testId: dbPart.test_id,
  partNumber: dbPart.part_number,
  directions: dbPart.directions || '',
  audioSrc: dbPart.audio_url,
  imageUrl: dbPart.image_url || undefined,
  transcript: dbPart.transcript || undefined
})

export const listeningService = {
  // Lấy danh sách các chủ đề luyện nghe đã xuất bản
  async listTopics(): Promise<ListeningTopic[]> {
    const { data, error } = await supabase
      .from('listening_topics')
      .select('*')
      .eq('is_published', true)
      .order('order', { ascending: true })
    
    if (error) throw error
    return (data ?? []).map(mapDbTopic)
  },

  // Lấy danh sách đề thi của một chủ đề
  async listTests(topicId: string): Promise<ListeningTest[]> {
    const { data, error } = await supabase
      .from('listening_tests')
      .select('*')
      .eq('topic_id', topicId)
      .order('order', { ascending: true })
    
    if (error) throw error
    return (data ?? []).map(mapDbTest)
  },

  // Lấy danh sách part của một đề thi
  async listParts(testId: string): Promise<ListeningPart[]> {
    const { data, error } = await supabase
      .from('listening_parts')
      .select('*')
      .eq('test_id', testId)
      .order('part_number', { ascending: true })
    
    if (error) throw error
    return (data ?? []).map(mapDbPart)
  },

  // Lấy chi tiết một part cùng với danh sách câu hỏi đi kèm
  async getPartWithQuestions(partId: string): Promise<{ part: ListeningPart; questions: ListeningQuestion[] } | null> {
    const { data, error } = await supabase
      .from('listening_parts')
      .select('*')
      .eq('id', partId)
      .maybeSingle()
    
    if (error) throw error
    if (!data) return null

    const part = mapDbPart(data)
    const questions = (data.questions || []).map((q: any) => ({
      id: q.id,
      partId: data.id,
      order: q.order || 0,
      questionText: q.questionText || q.question_text || '',
      options: q.options || [],
      correctIndex: q.correctIndex !== undefined ? q.correctIndex : q.correct_index,
      explanation: q.explanation || undefined
    }))

    return { part, questions }
  }
}
