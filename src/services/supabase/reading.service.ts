import { supabase } from '@/services/supabase/client'
import type {
  QuizAnswer,
  ReadingArticle,
  ReadingArticleDetail,
  ReadingArticleTerm,
  ReadingAttempt,
  ReadingFilters,
  ReadingHighlight,
  ReadingQuestion,
  ReadingStatsSummary,
} from '@/types/reading.types'

export const readingService = {
  async getArticleTerms(articleId: string): Promise<ReadingArticleTerm[]> {
    const { data, error } = await supabase.rpc('get_reading_article_terms', {
      p_article_id: articleId,
    })

    if (error) {
      console.error('Error fetching reading article terms:', error)
      throw error
    }

    return (data as ReadingArticleTerm[]) || []
  },

  /**
   * Lấy danh sách bài đọc công khai đã xuất bản kèm bộ lọc
   */
  async listArticles(
    filters: ReadingFilters = {},
    page = 1,
    limit = 12
  ): Promise<{ articles: ReadingArticle[]; total: number; totalPages: number }> {
    let query = supabase
      .from('reading_articles')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .is('deleted_at', null)

    if (filters.level && filters.level !== 'all') {
      query = query.eq('cefr_level', filters.level)
    }

    if (filters.purpose && filters.purpose !== 'all') {
      query = query.eq('purpose', filters.purpose)
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      query = query.eq('difficulty', filters.difficulty)
    }

    if (filters.accessTier && filters.accessTier !== 'all') {
      query = query.eq('access_tier', filters.accessTier)
    }

    if (filters.topic && filters.topic !== 'all') {
      query = query.contains('topics', [filters.topic])
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`
      query = query.or(`title.ilike.${term},subtitle.ilike.${term},plain_text.ilike.${term}`)
    }

    // Sort
    if (filters.sort === 'difficulty_asc') {
      query = query.order('difficulty', { ascending: true })
    } else if (filters.sort === 'difficulty_desc') {
      query = query.order('difficulty', { ascending: false })
    } else {
      query = query.order('published_at', { ascending: false })
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching reading articles:', error)
      throw error
    }

    const total = count ?? 0
    return {
      articles: (data as ReadingArticle[]) || [],
      total,
      totalPages: Math.ceil(total / limit) || 1,
    }
  },

  /**
   * Lấy chi tiết 1 bài đọc kèm câu hỏi kiểm tra
   */
  async getArticleDetail(id: string): Promise<ReadingArticleDetail | null> {
    const { data: article, error: articleError } = await supabase
      .from('reading_articles')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (articleError || !article) {
      if (articleError) console.error('Error fetching article detail:', articleError)
      return null
    }

    const { data: questions, error: questionsError } = await supabase
      .from('reading_questions')
      .select('*')
      .eq('article_id', id)
      .order('order_index', { ascending: true })

    if (questionsError) {
      console.error('Error fetching reading questions:', questionsError)
    }

    return {
      ...(article as ReadingArticle),
      questions: (questions as ReadingQuestion[]) || [],
    }
  },

  /**
   * Bắt đầu một phiên đọc bài mới hoặc lấy phiên hiện có
   */
  async startAttempt(articleId: string): Promise<ReadingAttempt> {
    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) throw new Error('User not authenticated')

    // Upsert attempt for (user_id, article_id)
    const { data, error } = await supabase
      .from('reading_attempts')
      .upsert(
        {
          user_id: userId,
          article_id: articleId,
          started_at: new Date().toISOString(),
          is_completed: false,
        },
        { onConflict: 'user_id,article_id' }
      )
      .select('*')
      .single()

    if (error) {
      console.error('Error starting reading attempt:', error)
      throw error
    }

    return data as ReadingAttempt
  },

  /**
   * Cập nhật tiến độ đọc (thời gian, từ vựng đã click)
   */
  async updateAttempt(
    attemptId: string,
    payload: {
      time_spent_seconds?: number
      words_clicked?: string[]
      words_added_to_study?: string[]
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('reading_attempts')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId)

    if (error) {
      console.error('Error updating reading attempt:', error)
    }
  },

  /**
   * Chấm điểm bài quiz đọc hiểu và nộp bài
   */
  async submitQuiz(
    attemptId: string,
    answers: QuizAnswer[],
    questions: ReadingQuestion[]
  ): Promise<{ score: number; total: number; percentage: number }> {
    let score = 0
    let total = 0

    const processedAnswers = answers.map((ans) => {
      const q = questions.find((item) => item.id === ans.question_id)
      if (!q) return { ...ans, is_correct: false }

      total += q.points || 1
      const correctOpt = q.options?.find((o) => o.is_correct)
      const isCorrect = correctOpt ? correctOpt.text === ans.selected_option : false

      if (isCorrect) {
        score += q.points || 1
      }

      return {
        ...ans,
        is_correct: isCorrect,
      }
    })

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0

    const { error } = await supabase
      .from('reading_attempts')
      .update({
        score,
        total_questions: questions.length,
        answers: processedAnswers,
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptId)

    if (error) {
      console.error('Error submitting reading quiz:', error)
      throw error
    }

    return { score, total, percentage }
  },

  /**
   * Lấy các đoạn highlight & note của bài đọc
   */
  async getHighlights(articleId: string): Promise<ReadingHighlight[]> {
    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) return []

    const { data, error } = await supabase
      .from('reading_highlights')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching reading highlights:', error)
      return []
    }

    return (data as ReadingHighlight[]) || []
  },

  /**
   * Lưu đoạn văn bản bôi đen (Highlight & Note)
   */
  async saveHighlight(
    articleId: string,
    payload: Omit<ReadingHighlight, 'id' | 'user_id' | 'article_id' | 'created_at'>
  ): Promise<ReadingHighlight> {
    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('reading_highlights')
      .insert({
        user_id: userId,
        article_id: articleId,
        text_content: payload.text_content,
        color: payload.color || 'yellow',
        note: payload.note || null,
        start_offset: payload.start_offset || 0,
        end_offset: payload.end_offset || 0,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error saving reading highlight:', error)
      throw error
    }

    return data as ReadingHighlight
  },

  /**
   * Xóa highlight
   */
  async deleteHighlight(id: string): Promise<void> {
    const { error } = await supabase.from('reading_highlights').delete().eq('id', id)
    if (error) console.error('Error deleting highlight:', error)
  },

  /**
   * Thống kê quá trình đọc của người dùng
   */
  async getUserStats(): Promise<ReadingStatsSummary> {
    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id

    if (!userId) {
      return {
        total_articles_read: 0,
        total_time_minutes: 0,
        avg_score: 0,
        streak_days: 0,
        level_distribution: {},
        topic_distribution: {},
      }
    }

    const { data: attempts, error } = await supabase
      .from('reading_attempts')
      .select('*, article:reading_articles(cefr_level, topics)')
      .eq('user_id', userId)
      .eq('is_completed', true)

    if (error || !attempts) {
      return {
        total_articles_read: 0,
        total_time_minutes: 0,
        avg_score: 0,
        streak_days: 0,
        level_distribution: {},
        topic_distribution: {},
      }
    }

    const totalRead = attempts.length
    let totalSeconds = 0
    let totalScores = 0
    const levelDist: Record<string, number> = {}
    const topicDist: Record<string, number> = {}

    attempts.forEach((att: any) => {
      totalSeconds += att.time_spent_seconds || 0
      const scorePct = att.total_questions > 0 ? (att.score / att.total_questions) * 100 : 0
      totalScores += scorePct

      if (att.article?.cefr_level) {
        levelDist[att.article.cefr_level] = (levelDist[att.article.cefr_level] || 0) + 1
      }
      if (Array.isArray(att.article?.topics)) {
        att.article.topics.forEach((t: string) => {
          topicDist[t] = (topicDist[t] || 0) + 1
        })
      }
    })

    return {
      total_articles_read: totalRead,
      total_time_minutes: Math.round(totalSeconds / 60),
      avg_score: totalRead > 0 ? Math.round(totalScores / totalRead) : 0,
      streak_days: totalRead > 0 ? Math.min(totalRead, 5) : 0,
      level_distribution: levelDist,
      topic_distribution: topicDist,
    }
  },
}
