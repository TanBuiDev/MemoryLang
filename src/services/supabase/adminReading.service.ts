import { generateAudio as callGenerateAudioApi } from '@/services/api/generateAudio.api'
import { supabase } from '@/services/supabase/client'
import { buildReadingOption } from '@/utils/readingContent'
import type {
  CreateArticleInput,
  ReadingArticle,
  ReadingArticleDetail,
  ReadingArticleOptions,
  ReadingOptionField,
} from '@/types/reading.types'

export const defaultReadingArticleOptions: ReadingArticleOptions = {
  cefr_level: [
    { value: 'A1', label: 'A1 - Beginner' },
    { value: 'A2', label: 'A2 - Elementary' },
    { value: 'B1', label: 'B1 - Intermediate' },
    { value: 'B2', label: 'B2 - Upper Intermediate' },
    { value: 'C1', label: 'C1 - Advanced' },
    { value: 'C2', label: 'C2 - Mastery' },
  ],
  difficulty: [
    { value: 'easy', label: 'Dễ (Easy)' },
    { value: 'medium', label: 'Vừa (Medium)' },
    { value: 'hard', label: 'Khó (Hard)' },
  ],
  purpose: [
    { value: 'General', label: 'Đọc Giao tiếp Chung' },
    { value: 'IELTS', label: 'Luyện thi IELTS' },
    { value: 'TOEFL', label: 'Luyện thi TOEFL' },
    { value: 'Academic', label: 'Học thuật Academic' },
  ],
  access_tier: [
    { value: 'free', label: 'Free Tier (Tất cả người dùng)' },
    { value: 'pro', label: 'Pro Tier (Chỉ Pro Users)' },
  ],
}

export const adminReadingService = {
  async getArticleOptions(): Promise<ReadingArticleOptions> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'reading_article_options')
      .maybeSingle()

    if (error) throw error

    const stored = data?.value as Partial<ReadingArticleOptions> | undefined
    return {
      cefr_level: stored?.cefr_level || defaultReadingArticleOptions.cefr_level,
      difficulty: stored?.difficulty || defaultReadingArticleOptions.difficulty,
      purpose: stored?.purpose || defaultReadingArticleOptions.purpose,
      access_tier: stored?.access_tier || defaultReadingArticleOptions.access_tier,
    }
  },

  async addArticleOption(
    field: ReadingOptionField,
    value: string,
    label: string
  ): Promise<ReadingArticleOptions> {
    const options = await this.getArticleOptions()
    const option = buildReadingOption(value, label)

    if (!options[field].some((item) => item.value === option.value)) {
      options[field] = [...options[field], option]
    }

    const { error } = await supabase
      .from('app_settings')
      .update({ value: options })
      .eq('key', 'reading_article_options')

    if (error) throw error
    return options
  },

  /**
   * Admin: Danh sách tất cả bài đọc (bao gồm bản nháp)
   */
  async listArticles(): Promise<ReadingArticle[]> {
    const { data, error } = await supabase
      .from('reading_articles')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin articles:', error)
      throw error
    }

    return (data as ReadingArticle[]) || []
  },

  /**
   * Admin: Chi tiết bài đọc kèm danh sách câu hỏi
   */
  async getArticleDetail(id: string): Promise<ReadingArticleDetail | null> {
    const { data: article, error: articleError } = await supabase
      .from('reading_articles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (articleError || !article) {
      if (articleError) console.error('Error fetching admin article detail:', articleError)
      return null
    }

    const { data: questions, error: questionsError } = await supabase
      .from('reading_questions')
      .select('*')
      .eq('article_id', id)
      .order('order_index', { ascending: true })

    if (questionsError) {
      console.error('Error fetching admin reading questions:', questionsError)
    }

    return {
      ...(article as ReadingArticle),
      questions: (questions || []) as any,
    }
  },

  /**
   * Admin: Tạo bài đọc mới kèm các câu hỏi kiểm tra
   */
  async createArticle(input: CreateArticleInput): Promise<ReadingArticle> {
    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id

    const wordCount = input.plain_text.trim().split(/\s+/).filter(Boolean).length
    const estTime = Math.max(1, Math.ceil(wordCount / 120))

    const { data: article, error: articleError } = await supabase
      .from('reading_articles')
      .insert({
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        content_html: input.content_html,
        plain_text: input.plain_text,
        cefr_level: input.cefr_level,
        difficulty: input.difficulty,
        topics: input.topics || [],
        purpose: input.purpose,
        access_tier: input.access_tier,
        is_published: input.is_published ?? false,
        published_at: input.is_published ? new Date().toISOString() : null,
        word_count: wordCount,
        estimated_reading_time: estTime,
        created_by: userId || null,
      })
      .select('*')
      .single()

    if (articleError || !article) {
      console.error('Error creating article:', articleError)
      throw articleError
    }

    // Insert questions if provided
    if (Array.isArray(input.questions) && input.questions.length > 0) {
      const questionsToInsert = input.questions.map((q, idx) => ({
        article_id: article.id,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: q.options || [],
        order_index: idx + 1,
        points: q.points || 1,
      }))

      const { error: qError } = await supabase.from('reading_questions').insert(questionsToInsert)
      if (qError) {
        console.error('Error creating article questions:', qError)
      }
    }

    return article as ReadingArticle
  },

  /**
   * Admin: Cập nhật bài đọc & thay thế toàn bộ câu hỏi
   */
  async updateArticle(id: string, input: Partial<CreateArticleInput>): Promise<ReadingArticle> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.subtitle !== undefined) updatePayload.subtitle = input.subtitle.trim() || null
    if (input.content_html !== undefined) updatePayload.content_html = input.content_html
    if (input.plain_text !== undefined) {
      updatePayload.plain_text = input.plain_text
      const wordCount = input.plain_text.trim().split(/\s+/).filter(Boolean).length
      updatePayload.word_count = wordCount
      updatePayload.estimated_reading_time = Math.max(1, Math.ceil(wordCount / 120))
    }
    if (input.cefr_level !== undefined) updatePayload.cefr_level = input.cefr_level
    if (input.difficulty !== undefined) updatePayload.difficulty = input.difficulty
    if (input.topics !== undefined) updatePayload.topics = input.topics
    if (input.purpose !== undefined) updatePayload.purpose = input.purpose
    if (input.access_tier !== undefined) updatePayload.access_tier = input.access_tier
    if (input.is_published !== undefined) {
      updatePayload.is_published = input.is_published
      if (input.is_published) {
        updatePayload.published_at = new Date().toISOString()
      }
    }

    const { data: article, error: articleError } = await supabase
      .from('reading_articles')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (articleError) {
      console.error('Error updating reading article:', articleError)
      throw articleError
    }

    // Update questions if provided
    if (Array.isArray(input.questions)) {
      // Delete old questions
      await supabase.from('reading_questions').delete().eq('article_id', id)

      if (input.questions.length > 0) {
        const questionsToInsert = input.questions.map((q, idx) => ({
          article_id: id,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          options: q.options || [],
          order_index: idx + 1,
          points: q.points || 1,
        }))

        await supabase.from('reading_questions').insert(questionsToInsert)
      }
    }

    return article as ReadingArticle
  },

  /**
   * Admin: Xóa bài đọc (Soft delete)
   */
  async deleteArticle(id: string): Promise<void> {
    const { error } = await supabase
      .from('reading_articles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error soft deleting reading article:', error)
      throw error
    }
  },

  /**
   * Admin: Xuất bản / Ẩn bài đọc hàng loạt
   */
  async bulkPublish(ids: string[], isPublished: boolean): Promise<void> {
    const { error } = await supabase
      .from('reading_articles')
      .update({
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) {
      console.error('Error bulk publishing reading articles:', error)
      throw error
    }
  },

  /**
   * Admin: Tạo tệp Audio TTS từ văn bản plain_text của bài đọc
   */
  async generateTtsAudio(articleId: string): Promise<{ audio_url: string; duration: number }> {
    const article = await this.getArticleDetail(articleId)
    if (!article || !article.plain_text) {
      throw new Error('Bài đọc không tồn tại hoặc chưa có nội dung văn bản.')
    }

    // Call generateAudio Edge Function
    const res = await callGenerateAudioApi(article.plain_text, 'en-US')
    if (!res.audioUrl) {
      throw new Error('Không thể tạo file phát âm thanh TTS.')
    }

    // Save audio_url to article
    const { error } = await supabase
      .from('reading_articles')
      .update({
        audio_url: res.audioUrl,
        audio_duration: 120, // default estimation
        updated_at: new Date().toISOString(),
      })
      .eq('id', articleId)

    if (error) {
      console.error('Error updating audio_url on article:', error)
    }

    return {
      audio_url: res.audioUrl,
      duration: 120,
    }
  },
}
