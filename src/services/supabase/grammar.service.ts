import { supabase } from '@/services/supabase/client'
import type { GrammarTopic, GrammarExercise } from '@/types/admin.types'
import type { LessonBlock } from '@/types/grammar.types'

export const grammarService = {
  async listTopics(): Promise<GrammarTopic[]> {
    const { data, error } = await supabase
      .from('grammar_topics')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as GrammarTopic[]
  },

  async getTopic(id: string): Promise<GrammarTopic | null> {
    const { data, error } = await supabase
      .from('grammar_topics')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as GrammarTopic
  },

  async getBlocks(topicId: string): Promise<LessonBlock[]> {
    const { data, error } = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('topic_id', topicId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data as LessonBlock[]
  },

  async incrementViewCount(topicId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_grammar_view_count', {
      p_topic_id: topicId
    })
    if (error) throw error
  },

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
