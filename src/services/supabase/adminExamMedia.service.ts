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
  usage?: { sectionCount: number; exams: string[] }
}

export interface B1SignQuestion {
  id: string
  source_key: string
  source_number: string | null
  prompt: string
  image_url: string | null
  image_alt: string
  image_crop: string
  metadata: Record<string, unknown>
}

export interface ExamMediaAssetUsage {
  resource_type: B1MediaResourceKind | 'question'
  resource_id: string
  usage_role: 'audio' | 'image' | 'tts_prompt'
}

export interface ExamMediaAsset {
  id: string
  media_kind: 'audio' | 'image'
  bucket_id: string
  storage_path: string
  public_url: string
  display_name: string
  language_code?: string | null
  transcript?: string | null
  duration_seconds?: number | null
  version_number: number
  replaces_asset_id: string | null
  created_at: string
  usages: ExamMediaAssetUsage[]
  usage_count: number
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

const managedStorageBuckets = new Set(['audio_assets', 'vocabulary-images'])

type ExamSectionResource = {
  resource_type: B1MediaResourceKind
  resource_id: string
  skill?: string | null
}

async function listExamSectionResources(examId: string): Promise<ExamSectionResource[]> {
  const { data, error } = await supabase
    .from('exam_sections')
    .select('resource_type,resource_id,skill')
    .eq('exam_id', examId)
    .order('order_index')
  if (error) throw error
  return (data ?? []) as ExamSectionResource[]
}

async function assertResourceBelongsToExam(examId: string, resourceType: B1MediaResourceKind, resourceId: string): Promise<void> {
  const sections = await listExamSectionResources(examId)
  if (!sections.some((section) => section.resource_type === resourceType && section.resource_id === resourceId)) {
    throw new Error('Nội dung không thuộc đề thi đang quản lý.')
  }
}

async function assertQuestionBelongsToExam(examId: string, questionId: string, skill?: string): Promise<void> {
  const sections = await listExamSectionResources(examId)
  const activityIds = [...new Set(sections
    .filter((section) => section.resource_type === 'activity' && (!skill || section.skill === skill))
    .map((section) => section.resource_id))]
  if (activityIds.length === 0) throw new Error('Câu hỏi không thuộc đề thi đang quản lý.')

  const { data, error } = await supabase
    .from('practice_questions')
    .select('id')
    .eq('id', questionId)
    .in('activity_id', activityIds)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Câu hỏi không thuộc đề thi đang quản lý.')
}

async function assertExamExists(examId: string): Promise<void> {
  const { data, error } = await supabase.from('exams').select('id').eq('id', examId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Không tìm thấy đề thi.')
}

async function createMediaAsset(input: Omit<ExamMediaAsset, 'id' | 'created_at' | 'usages' | 'usage_count'>): Promise<ExamMediaAsset> {
  const { data, error } = await supabase
    .from('exam_media_assets')
    .insert(input)
    .select('id,media_kind,bucket_id,storage_path,public_url,display_name,language_code,transcript,duration_seconds,version_number,replaces_asset_id,created_at')
    .single()
  if (error) throw error
  return { ...data, usages: [], usage_count: 0 } as ExamMediaAsset
}

async function replaceAssetUsage(input: { assetId: string; resourceType: B1MediaResourceKind | 'question'; resourceId: string; usageRole: ExamMediaAssetUsage['usage_role'] }): Promise<void> {
  const { error: deleteError } = await supabase
    .from('exam_media_asset_usages')
    .delete()
    .eq('resource_type', input.resourceType)
    .eq('resource_id', input.resourceId)
    .eq('usage_role', input.usageRole)
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from('exam_media_asset_usages')
    .insert({ asset_id: input.assetId, resource_type: input.resourceType, resource_id: input.resourceId, usage_role: input.usageRole })
  if (insertError) throw insertError
}

export const adminExamMediaService = {
  async listResources(examId: string): Promise<B1MediaResource[]> {
    const sections = await listExamSectionResources(examId)
    const activityIds = [...new Set((sections ?? []).filter((section) => section.resource_type === 'activity').map((section) => section.resource_id))]
    const promptIds = [...new Set((sections ?? []).filter((section) => section.resource_type === 'prompt').map((section) => section.resource_id))]
    const [activityResult, promptResult] = await Promise.all([
      activityIds.length > 0
        ? supabase.from('practice_activities').select('id,source_key,title,skill,content,passage,audio_url,is_published').in('id', activityIds)
        : Promise.resolve({ data: [], error: null }),
      promptIds.length > 0
        ? supabase.from('practice_prompts').select('id,source_key,title,skill,prompt,content,audio_url,is_published').in('id', promptIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (activityResult.error) throw activityResult.error
    if (promptResult.error) throw promptResult.error

    const activitiesById = new Map((activityResult.data ?? []).map((activity: any) => [activity.id, activity]))
    const promptsById = new Map((promptResult.data ?? []).map((prompt: any) => [prompt.id, prompt]))
    const resources = sections.flatMap((section) => {
      const item = section.resource_type === 'activity' ? activitiesById.get(section.resource_id) : promptsById.get(section.resource_id)
      if (!item) return []
      return [{ ...item, kind: section.resource_type as B1MediaResourceKind, text: item.passage || item.prompt || item.content || '' }]
    }) as B1MediaResource[]
    const resourceIds = [...new Set(resources.map((resource) => resource.id))]
    if (resourceIds.length === 0) return resources

    const { data: usageRows, error: usageError } = await supabase
      .from('exam_sections')
      .select('resource_id,resource_type,exam:exams(title)')
      .in('resource_id', resourceIds)
    if (usageError) throw usageError

    const usageByResource = new Map<string, { sectionCount: number; exams: Set<string> }>()
    for (const row of usageRows ?? []) {
      const key = `${row.resource_type}:${row.resource_id}`
      const entry = usageByResource.get(key) ?? { sectionCount: 0, exams: new Set<string>() }
      entry.sectionCount += 1
      const exams = Array.isArray(row.exam) ? row.exam : row.exam ? [row.exam] : []
      for (const exam of exams) if (typeof exam.title === 'string' && exam.title.trim()) entry.exams.add(exam.title)
      usageByResource.set(key, entry)
    }
    return resources.map((resource) => {
      const usage = usageByResource.get(`${resource.kind}:${resource.id}`)
      return usage ? { ...resource, usage: { sectionCount: usage.sectionCount, exams: [...usage.exams] } } : resource
    })
  },

  async setAudioUrl(examId: string, resource: B1MediaResource, audioUrl: string | null): Promise<void> {
    await assertResourceBelongsToExam(examId, resource.kind, resource.id)
    const table = resource.kind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase.from(table).update({ audio_url: audioUrl }).eq('id', resource.id)
    if (error) throw error
  },

  async clearAudioAsset(examId: string, resource: B1MediaResource): Promise<void> {
    const { error } = await supabase.rpc('clear_b1_exam_audio_asset_atomically', {
      p_exam_id: examId,
      p_resource_type: resource.kind,
      p_resource_id: resource.id,
    })
    if (error) throw error
  },

  async listAssets(examId: string): Promise<ExamMediaAsset[]> {
    const sections = await listExamSectionResources(examId)
    const activityIds = [...new Set(sections.filter((section) => section.resource_type === 'activity').map((section) => section.resource_id))]
    const resourceIds = [...new Set(sections.map((section) => section.resource_id))]
    const questionResult = activityIds.length > 0
      ? await supabase.from('practice_questions').select('id').in('activity_id', activityIds)
      : { data: [], error: null }
    if (questionResult.error) throw questionResult.error
    const ownedResourceIds = [...new Set([...resourceIds, ...(questionResult.data ?? []).map((question) => question.id)])]
    if (ownedResourceIds.length === 0) return []

    const { data: scopedUsages, error: scopedUsageError } = await supabase
      .from('exam_media_asset_usages')
      .select('asset_id')
      .in('resource_id', ownedResourceIds)
    if (scopedUsageError) throw scopedUsageError
    const assetIds = [...new Set((scopedUsages ?? []).map((usage) => usage.asset_id))]
    if (assetIds.length === 0) return []

    const { data: assets, error } = await supabase
      .from('exam_media_assets')
      .select('id,media_kind,bucket_id,storage_path,public_url,display_name,language_code,transcript,duration_seconds,version_number,replaces_asset_id,created_at')
      .in('id', assetIds)
      .order('created_at', { ascending: false })
    if (error) throw error
    if (!assets?.length) return []
    const { data: usages, error: usageError } = await supabase
      .from('exam_media_asset_usages')
      .select('asset_id,resource_type,resource_id,usage_role')
      .in('asset_id', assets.map((asset) => asset.id))
    if (usageError) throw usageError
    const usagesByAsset = new Map<string, ExamMediaAssetUsage[]>()
    for (const usage of usages ?? []) {
      const entries = usagesByAsset.get(usage.asset_id) ?? []
      entries.push(usage as ExamMediaAssetUsage)
      usagesByAsset.set(usage.asset_id, entries)
    }
    return assets.map((asset) => {
      const assetUsages = usagesByAsset.get(asset.id) ?? []
      return { ...asset, usages: assetUsages, usage_count: assetUsages.length } as ExamMediaAsset
    })
  },

  async createExternalAudioAsset(examId: string, input: { url: string; displayName: string; languageCode?: string; transcript?: string; replacesAssetId?: string | null }): Promise<ExamMediaAsset> {
    await assertExamExists(examId)
    return createMediaAsset({
      media_kind: 'audio', bucket_id: 'external', storage_path: `external/${crypto.randomUUID()}`, public_url: input.url,
      display_name: input.displayName, language_code: input.languageCode ?? null, transcript: input.transcript ?? null,
      duration_seconds: null, version_number: input.replacesAssetId ? 2 : 1, replaces_asset_id: input.replacesAssetId ?? null,
    })
  },

  async attachAudioAsset(examId: string, resource: B1MediaResource, asset: ExamMediaAsset): Promise<void> {
    if (asset.media_kind !== 'audio') throw new Error('Chỉ có thể gắn audio vào nội dung nghe hoặc prompt.')
    await assertResourceBelongsToExam(examId, resource.kind, resource.id)
    const table = resource.kind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase.from(table).update({ audio_url: asset.public_url }).eq('id', resource.id)
    if (error) throw error
    await replaceAssetUsage({ assetId: asset.id, resourceType: resource.kind, resourceId: resource.id, usageRole: 'audio' })
  },

  async setPublished(examId: string, resource: B1MediaResource, isPublished: boolean): Promise<void> {
    await assertResourceBelongsToExam(examId, resource.kind, resource.id)
    const table = resource.kind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase.from(table).update({ is_published: isPublished }).eq('id', resource.id)
    if (error) throw error
  },

  async uploadAudio(examId: string, file: File, sourceKey: string, replacesAssetId?: string | null): Promise<ExamMediaAsset> {
    await assertExamExists(examId)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'mp3'
    const path = `b1-exams/${sourceKey}-${Date.now()}.${extension}`
    const storage = supabase.storage.from('audio_assets')
    const { error } = await storage.upload(path, file, { cacheControl: '31536000', upsert: false })
    if (error) throw error
    try {
      return await createMediaAsset({
        media_kind: 'audio', bucket_id: 'audio_assets', storage_path: path, public_url: storage.getPublicUrl(path).data.publicUrl,
        display_name: file.name, language_code: null, transcript: null, duration_seconds: null,
        version_number: replacesAssetId ? 2 : 1, replaces_asset_id: replacesAssetId ?? null,
      })
    } catch (metadataError) {
      await storage.remove([path])
      throw metadataError
    }
  },

  async listSigns(examId: string): Promise<B1SignQuestion[]> {
    const sections = await listExamSectionResources(examId)
    const signsActivityIds = [...new Set(sections
      .filter((section) => section.resource_type === 'activity' && section.skill === 'signs')
      .map((section) => section.resource_id))]
    if (signsActivityIds.length === 0) return []
    const { data, error } = await supabase
      .from('practice_questions')
      .select('id,source_key,source_number,prompt,image_url,metadata')
      .in('activity_id', signsActivityIds)
      .order('order_index')
    if (error) throw error
    return (data ?? []).map((sign: any) => ({
      ...sign, metadata: sign.metadata && typeof sign.metadata === 'object' ? sign.metadata : {},
      image_alt: typeof sign.metadata?.image_alt === 'string' ? sign.metadata.image_alt : '',
      image_crop: typeof sign.metadata?.image_crop === 'string' ? sign.metadata.image_crop : 'contain',
    })) as B1SignQuestion[]
  },

  async uploadSignImage(examId: string, file: File, sourceKey: string, replacesAssetId?: string | null): Promise<ExamMediaAsset> {
    await assertExamExists(examId)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `b1-signs/${sourceKey}-${Date.now()}.${extension}`
    const storage = supabase.storage.from('vocabulary-images')
    const { error } = await storage.upload(path, file, { cacheControl: '31536000', upsert: false })
    if (error) throw error
    try {
      return await createMediaAsset({
        media_kind: 'image', bucket_id: 'vocabulary-images', storage_path: path, public_url: storage.getPublicUrl(path).data.publicUrl,
        display_name: file.name, language_code: null, transcript: null, duration_seconds: null,
        version_number: replacesAssetId ? 2 : 1, replaces_asset_id: replacesAssetId ?? null,
      })
    } catch (metadataError) {
      await storage.remove([path])
      throw metadataError
    }
  },

  async setSignImage(examId: string, questionId: string, imageUrl: string | null): Promise<void> {
    await assertQuestionBelongsToExam(examId, questionId, 'signs')
    const { error } = await supabase.from('practice_questions').update({ image_url: imageUrl }).eq('id', questionId)
    if (error) throw error
  },

  async attachSignImage(examId: string, questionId: string, asset: ExamMediaAsset): Promise<void> {
    if (asset.media_kind !== 'image') throw new Error('Chỉ có thể gắn ảnh vào câu Signs.')
    await assertQuestionBelongsToExam(examId, questionId, 'signs')
    const { error } = await supabase.from('practice_questions').update({ image_url: asset.public_url }).eq('id', questionId)
    if (error) throw error
    await replaceAssetUsage({ assetId: asset.id, resourceType: 'question', resourceId: questionId, usageRole: 'image' })
  },

  async deleteAsset(examId: string, asset: ExamMediaAsset): Promise<void> {
    await assertExamExists(examId)
    const { count, error: usageError } = await supabase
      .from('exam_media_asset_usages')
      .select('id', { count: 'exact', head: true })
      .eq('asset_id', asset.id)
    if (usageError) throw usageError
    if ((count ?? 0) > 0) throw new Error('Không thể xóa media đang được sử dụng.')
    if (managedStorageBuckets.has(asset.bucket_id)) {
      const { error: storageError } = await supabase.storage.from(asset.bucket_id).remove([asset.storage_path])
      if (storageError) throw storageError
    }
    const { error } = await supabase.from('exam_media_assets').delete().eq('id', asset.id)
    if (error) throw error
  },

  async updateSignImageAlt(examId: string, sign: B1SignQuestion, imageAlt: string): Promise<void> {
    await assertQuestionBelongsToExam(examId, sign.id, 'signs')
    const { error } = await supabase.from('practice_questions').update({ metadata: { ...sign.metadata, image_alt: imageAlt.trim() } }).eq('id', sign.id)
    if (error) throw error
  },

  async updateSignImageCrop(examId: string, sign: B1SignQuestion, imageCrop: string): Promise<void> {
    await assertQuestionBelongsToExam(examId, sign.id, 'signs')
    const { error } = await supabase.from('practice_questions').update({ metadata: { ...sign.metadata, image_crop: imageCrop } }).eq('id', sign.id)
    if (error) throw error
  },

  async listQuestionReviews(examId: string): Promise<B1QuestionReviewEditor[]> {
    const sections = await listExamSectionResources(examId)
    const activityIds = [...new Set(sections.filter((section) => section.resource_type === 'activity').map((section) => section.resource_id))]
    if (activityIds.length === 0) return []

    const { data, error } = await supabase
      .from('practice_questions')
      .select('id,source_key,source_number,prompt,translation,explanation,activity:practice_activities(title)')
      .in('activity_id', activityIds)
      .order('order_index')
    if (error) throw error
    return (data ?? []).map((question: any) => ({ ...question, activity_title: question.activity?.title ?? 'B1' })) as B1QuestionReviewEditor[]
  },

  async updateQuestionReview(examId: string, questionId: string, input: Pick<B1QuestionReviewEditor, 'translation' | 'explanation'>): Promise<void> {
    await assertQuestionBelongsToExam(examId, questionId)
    const { error } = await supabase.from('practice_questions').update(input).eq('id', questionId)
    if (error) throw error
  },

  async setExamPublished(examId: string, isPublished: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_b1_exam_published_guarded', { p_exam_id: examId, p_is_published: isPublished })
    if (error) throw error
  },
}
