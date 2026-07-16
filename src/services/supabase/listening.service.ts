import { supabase } from '@/services/supabase/client'
import type {
  ListeningTopic,
  ListeningTest,
  ListeningPart,
  ListeningQuestion,
  ListeningTopicAccess,
} from '@/types/listening.types'

const mapDbTopic = (dbTopic: any): ListeningTopic => ({
  id: dbTopic.id,
  title: dbTopic.title,
  description: dbTopic.description || undefined,
  order: dbTopic.order || 0,
  access_tier: dbTopic.access_tier || 'free',
  teaser_config: dbTopic.teaser_config || { enabled: true, type: 'title_only' }
})

const mapDbTopicAccess = (dbTopic: any): ListeningTopicAccess | null => {
  if (!dbTopic) return null

  return {
    id: dbTopic.id,
    title: dbTopic.title,
    access_tier: dbTopic.access_tier || 'free',
    teaser_config: dbTopic.teaser_config || { enabled: true, type: 'title_only' },
    is_published: dbTopic.is_published,
  }
}

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
  // Lấy metadata topic tối thiểu để kiểm tra access trước khi tải payload sâu
  async getTopic(topicId: string): Promise<ListeningTopicAccess | null> {
    const { data, error } = await supabase
      .from('listening_topics')
      .select('id,title,access_tier,teaser_config,is_published')
      .eq('id', topicId)
      .maybeSingle()

    if (error) throw error
    return mapDbTopicAccess(data)
  },

  async getTopicByTestId(testId: string): Promise<ListeningTopicAccess | null> {
    const { data, error } = await supabase
      .from('listening_tests')
      .select('topic:listening_topics(id,title,access_tier,teaser_config,is_published)')
      .eq('id', testId)
      .maybeSingle()

    if (error) throw error
    return mapDbTopicAccess(Array.isArray(data?.topic) ? data.topic[0] : data?.topic)
  },

  async getTopicByPartId(partId: string): Promise<ListeningTopicAccess | null> {
    const { data, error } = await supabase
      .from('listening_parts')
      .select('test:listening_tests(topic:listening_topics(id,title,access_tier,teaser_config,is_published))')
      .eq('id', partId)
      .maybeSingle()

    if (error) throw error
    const test = Array.isArray(data?.test) ? data.test[0] : data?.test
    const topic = Array.isArray(test?.topic) ? test.topic[0] : test?.topic
    return mapDbTopicAccess(topic)
  },

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
