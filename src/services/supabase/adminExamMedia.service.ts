import { supabase } from '@/services/supabase/client'

export type B1MediaResourceKind = 'activity' | 'prompt'

export interface B1MediaResource {
  id: string
  source_key: string
  title: string
  skill: string
  kind: B1MediaResourceKind
  text: string
  audio_url: string | null
  is_published: boolean
}

export interface B1SignQuestion {
  id: string
  source_key: string
  source_number: string | null
  prompt: string
  image_url: string | null
}

export interface B1QuestionReviewEditor {
  id: string
  source_key: string
  source_number: string | null
  prompt: string
  translation: string | null
  explanation: string | null
  activity_title: string
}

export const adminExamMediaService = {
  async listResources(): Promise<B1MediaResource[]> {
    const { data, error } = await supabase
      .from('exam_sections')
      .select('resource_type,activity:practice_activities(id,source_key,title,skill,content,passage,audio_url,is_published),prompt:practice_prompts(id,source_key,title,skill,prompt,content,audio_url,is_published),exam:exams!inner(source_key)')
      .eq('exam.source_key', 'b1-de-full-copy')
      .order('order_index')
    if (error) throw error
    return (data ?? []).flatMap((section: any) => {
      const item = section.resource_type === 'activity' ? section.activity : section.prompt
      if (!item) return []
      return [{
        ...item,
        kind: section.resource_type as B1MediaResourceKind,
        text: item.passage || item.prompt || item.content || '',
      }]
    }) as B1MediaResource[]
  },

  async setAudioUrl(resource: B1MediaResource, audioUrl: string | null): Promise<void> {
    const table = resource.kind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase.from(table).update({ audio_url: audioUrl }).eq('id', resource.id)
    if (error) throw error
  },

  async setPublished(resource: B1MediaResource, isPublished: boolean): Promise<void> {
    const table = resource.kind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase.from(table).update({ is_published: isPublished }).eq('id', resource.id)
    if (error) throw error
  },

  async uploadAudio(file: File, sourceKey: string): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'mp3'
    const path = `b1-exams/${sourceKey}-${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('audio_assets').upload(path, file, { cacheControl: '31536000', upsert: false })
    if (error) throw error
    return supabase.storage.from('audio_assets').getPublicUrl(path).data.publicUrl
  },

  async listSigns(): Promise<B1SignQuestion[]> {
    const { data, error } = await supabase
      .from('practice_questions')
      .select('id,source_key,source_number,prompt,image_url,activity:practice_activities!inner(source_key)')
      .eq('activity.source_key', 'signs')
      .order('order_index')
    if (error) throw error
    return (data ?? []) as B1SignQuestion[]
  },

  async uploadSignImage(file: File, sourceKey: string): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `b1-signs/${sourceKey}-${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('vocabulary-images').upload(path, file, { cacheControl: '31536000', upsert: false })
    if (error) throw error
    return supabase.storage.from('vocabulary-images').getPublicUrl(path).data.publicUrl
  },

  async setSignImage(questionId: string, imageUrl: string | null): Promise<void> {
    const { error } = await supabase.from('practice_questions').update({ image_url: imageUrl }).eq('id', questionId)
    if (error) throw error
  },

  async listQuestionReviews(): Promise<B1QuestionReviewEditor[]> {
    const { data, error } = await supabase
      .from('practice_questions')
      .select('id,source_key,source_number,prompt,translation,explanation,activity:practice_activities!inner(title,exam_sections!inner(exam:exams!inner(source_key)))')
      .eq('activity.exam_sections.exam.source_key', 'b1-de-full-copy')
      .order('order_index')
    if (error) throw error
    return (data ?? []).map((question: any) => ({
      ...question,
      activity_title: question.activity?.title ?? 'B1',
    })) as B1QuestionReviewEditor[]
  },

  async updateQuestionReview(questionId: string, input: Pick<B1QuestionReviewEditor, 'translation' | 'explanation'>): Promise<void> {
    const { error } = await supabase.from('practice_questions').update(input).eq('id', questionId)
    if (error) throw error
  },

  async setB1ExamPublished(isPublished: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_b1_exam_published_guarded', { p_is_published: isPublished })
    if (error) throw error
  },
}
