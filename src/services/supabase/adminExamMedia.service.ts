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

export const adminExamMediaService = {
  async listResources(): Promise<B1MediaResource[]> {
    const [activitiesResult, promptsResult] = await Promise.all([
      supabase.from('practice_activities').select('id,source_key,title,skill,content,passage,audio_url,is_published').order('source_key'),
      supabase.from('practice_prompts').select('id,source_key,title,skill,prompt,content,audio_url,is_published').order('source_key'),
    ])
    if (activitiesResult.error) throw activitiesResult.error
    if (promptsResult.error) throw promptsResult.error
    return [
      ...(activitiesResult.data ?? []).map((item: any) => ({ ...item, kind: 'activity' as const, text: item.passage || item.content || '' })),
      ...(promptsResult.data ?? []).map((item: any) => ({ ...item, kind: 'prompt' as const, text: item.prompt || item.content || '' })),
    ].filter((item) => item.skill === 'listening' || item.skill === 'writing' || item.skill === 'speaking')
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
}
