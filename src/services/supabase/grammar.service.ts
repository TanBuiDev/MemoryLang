import { supabase } from '@/services/supabase/client'
import type { GrammarTopic, GrammarExercise } from '@/types/admin.types'

export const grammarService = {
  // Lấy danh sách các chủ đề ngữ pháp đã được xuất bản
  async listTopics(): Promise<GrammarTopic[]> {
    const { data, error } = await supabase
      .from('grammar_topics')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data as GrammarTopic[]
  },

  // Lấy danh sách bài tập của một chủ đề ngữ pháp
  async listExercises(topicId: string): Promise<GrammarExercise[]> {
    const { data, error } = await supabase
      .from('grammar_exercises')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data as GrammarExercise[]
  }
}
