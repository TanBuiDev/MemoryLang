import { supabase } from '@/services/supabase/client'
import type { AppSetting, TtsVoiceConfig, FeatureFlag, AdminAuditLog, AdminUserStats, GrammarTopic, GrammarExercise } from '@/types/admin.types'
import type { LessonBlock } from '@/types/grammar.types'
import type { Profile } from '@/types/auth.types'
import type { AdminSubscriptionPlanUpdateInput, SubscriptionPlanPrice } from '@/types/subscription.types'

export const adminService = {
  // Helper lấy thông tin user hiện tại đang login
  async getCurrentAdminId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id ?? null
  },

  // Ghi Audit Log
  async logAction(action: string, targetType?: string, targetId?: string, details?: Record<string, any>): Promise<void> {
    try {
      const adminId = await this.getCurrentAdminId()
      if (!adminId) return

      await supabase.from('admin_audit_log').insert({
        admin_id: adminId,
        action,
        target_type: targetType || null,
        target_id: targetId || null,
        details: details || {},
      })
    } catch (err) {
      console.error('Failed to log admin action:', err)
    }
  },

  // 1. Dashboard Stats
  async getDashboardStats(): Promise<AdminUserStats> {
    // Đếm tổng users
    const { count: totalUsers, error: err1 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    if (err1) throw err1

    // Đếm new users (7 ngày)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count: newUsers7d, error: err2 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
    if (err2) throw err2

    // Đếm tổng active user_terms của tất cả người dùng
    const { count: totalVocab, error: err3 } = await supabase
      .from('user_terms')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
    if (err3) throw err3

    // Đếm tổng global_terms toàn cục
    const { count: globalVocab, error: err7 } = await supabase
      .from('global_terms')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
    if (err7) throw err7

    // Đếm tổng decks
    const { count: totalDecks, error: err4 } = await supabase
      .from('decks')
      .select('*', { count: 'exact', head: true })
    if (err4) throw err4

    // Đếm study sessions hôm nay
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const { count: studySessionsToday, error: err5 } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', startOfToday.toISOString())
    if (err5) throw err5

    // Đếm active users 30d (dựa trên study sessions độc nhất của users trong 30d)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: activeUsersData, error: err6 } = await supabase
      .from('study_sessions')
      .select('user_id')
      .gte('started_at', thirtyDaysAgo.toISOString())
    if (err6) throw err6

    const activeUsersSet = new Set(activeUsersData?.map(item => item.user_id) ?? [])

    return {
      totalUsers: totalUsers ?? 0,
      newUsers7d: newUsers7d ?? 0,
      activeUsers30d: activeUsersSet.size || (totalUsers ?? 0), // Fallback về totalUsers nếu không có session
      totalVocab: totalVocab ?? 0,
      globalVocab: globalVocab ?? 0,
      totalDecks: totalDecks ?? 0,
      studySessionsToday: studySessionsToday ?? 0,
    }
  },

  // 2. Users Management
  async listUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, subscriptions(plan_type, status)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async updateUserSubscription(userId: string, planType: 'free' | 'pro'): Promise<any> {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_type: planType,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select('*')
      .single()

    if (error) throw error

    await this.logAction(
      planType === 'pro' ? 'grant_pro' : 'revoke_pro',
      'subscription',
      userId,
      { plan_type: planType }
    )
    return data
  },

  async listSubscriptionPlans(): Promise<SubscriptionPlanPrice[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('plan_type', { ascending: true })
      .order('billing_cycle', { ascending: true })

    if (error) throw error
    return (data ?? []) as SubscriptionPlanPrice[]
  },

  async updateSubscriptionPlanPrice(input: AdminSubscriptionPlanUpdateInput): Promise<SubscriptionPlanPrice> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Giá gói phải lớn hơn 0.')
    }

    if (!input.reason.trim()) {
      throw new Error('Vui lòng nhập lý do thay đổi giá gói.')
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        amount: input.amount,
        currency: input.currency,
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('plan_type', input.planType)
      .eq('billing_cycle', input.billingCycle)
      .select('*')
      .single()

    if (error) throw error

    await this.logAction('admin_update_subscription_price', 'subscription_plan', data.id, {
      plan_type: input.planType,
      billing_cycle: input.billingCycle,
      amount: input.amount,
      currency: input.currency,
      is_active: input.isActive,
      reason: input.reason,
    })

    return data as SubscriptionPlanPrice
  },

  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .select('*')
      .single()
    if (error) throw error

    await this.logAction(
      isAdmin ? 'grant_admin' : 'revoke_admin',
      'profile',
      userId,
      { display_name: data.display_name, email: data.email }
    )
    return data as Profile
  },

  async updateUserProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single()
    if (error) throw error

    await this.logAction(
      'update_user_profile',
      'profile',
      userId,
      updates
    )
    return data as Profile
  },

  // 3. Cấu hình app_settings
  async listSettings(): Promise<AppSetting[]> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('key')
    if (error) throw error
    return data as AppSetting[]
  },

  async updateSetting(key: string, value: any, description?: string): Promise<AppSetting> {
    const adminId = await this.getCurrentAdminId()
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .select('*')
      .single()
    if (error) throw error

    await this.logAction(
      'update_app_setting',
      'app_setting',
      key,
      { value, description }
    )
    return data as AppSetting
  },

  // 4. Feature Flags
  async listFeatureFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag')
    if (error) throw error
    return data as FeatureFlag[]
  },

  async updateFeatureFlag(flag: string, enabled: boolean, description?: string): Promise<FeatureFlag> {
    const { data, error } = await supabase
      .from('feature_flags')
      .upsert({
        flag,
        enabled,
        description,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw error

    await this.logAction(
      enabled ? 'enable_feature_flag' : 'disable_feature_flag',
      'feature_flag',
      flag,
      { enabled, description }
    )
    return data as FeatureFlag
  },

  // 5. TTS Voice Config
  async listTtsConfigs(): Promise<TtsVoiceConfig[]> {
    const { data, error } = await supabase
      .from('tts_voice_config')
      .select('*')
      .order('language_code')
    if (error) throw error
    return data as TtsVoiceConfig[]
  },

  async updateTtsConfig(languageCode: string, updates: Partial<TtsVoiceConfig>): Promise<TtsVoiceConfig> {
    const { data, error } = await supabase
      .from('tts_voice_config')
      .update(updates)
      .eq('language_code', languageCode)
      .select('*')
      .single()
    if (error) throw error

    await this.logAction(
      'update_tts_config',
      'tts_voice_config',
      languageCode,
      updates
    )
    return data as TtsVoiceConfig
  },

  // 6. Audit Log
  async listAuditLogs(): Promise<AdminAuditLog[]> {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        id,
        admin_id,
        action,
        target_type,
        target_id,
        details,
        created_at,
        profiles(display_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    return (data ?? []).map((log: any) => {
      // Ép kiểu profiles an toàn do Supabase trả về có thể là object hoặc array
      const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles
      return {
        id: log.id,
        admin_id: log.admin_id,
        action: log.action,
        target_type: log.target_type,
        target_id: log.target_id,
        details: log.details,
        created_at: log.created_at,
        admin_email: profile?.email || profile?.display_name || 'System / Unknown',
      }
    }) as AdminAuditLog[]
  },

  // 7. Vocabulary Management (global_terms)
  async listGlobalTerms(): Promise<any[]> {
    const { data, error } = await supabase
      .from('global_terms')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async createGlobalTerm(term: any): Promise<any> {
    const { data, error } = await supabase
      .from('global_terms')
      .insert(term)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('create_global_term', 'global_term', data.id, { source_text: data.source_text })
    return data
  },

  async updateGlobalTerm(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('global_terms')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('update_global_term', 'global_term', id, updates)
    return data
  },

  async deleteGlobalTerm(id: string): Promise<void> {
    const { error } = await supabase
      .from('global_terms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await this.logAction('delete_global_term', 'global_term', id)
  },

  async bulkImportVocabulary(terms: any[]): Promise<number> {
    const { data, error } = await supabase
      .from('global_terms')
      .upsert(terms, { onConflict: 'normalized_text,source_language,native_language' })
      .select('id')
    if (error) throw error
    await this.logAction('bulk_import_vocabulary', 'global_term', undefined, { count: terms.length })
    return data?.length ?? 0
  },

  // 8. Grammar Management
  async listGrammarTopics(): Promise<GrammarTopic[]> {
    const { data, error } = await supabase
      .from('grammar_topics')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as GrammarTopic[]
  },

  async createGrammarTopic(topic: Omit<GrammarTopic, 'id' | 'created_at'>): Promise<GrammarTopic> {
    const { data, error } = await supabase
      .from('grammar_topics')
      .insert(topic)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('create_grammar_topic', 'grammar_topic', data.id, { title: topic.title })
    return data as GrammarTopic
  },

  async updateGrammarTopic(id: string, updates: Partial<GrammarTopic>): Promise<GrammarTopic> {
    const { data, error } = await supabase
      .from('grammar_topics')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('update_grammar_topic', 'grammar_topic', id, updates)
    return data as GrammarTopic
  },

  async deleteGrammarTopic(id: string): Promise<void> {
    const { error } = await supabase
      .from('grammar_topics')
      .delete()
      .eq('id', id)
    if (error) throw error
    await this.logAction('delete_grammar_topic', 'grammar_topic', id)
  },

  async listGrammarExercises(topicId: string): Promise<GrammarExercise[]> {
    const { data, error } = await supabase
      .from('grammar_exercises')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at')
    if (error) throw error
    return data as GrammarExercise[]
  },

  async createGrammarExercise(exercise: Omit<GrammarExercise, 'id' | 'created_at'>): Promise<GrammarExercise> {
    const { data, error } = await supabase
      .from('grammar_exercises')
      .insert(exercise)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('create_grammar_exercise', 'grammar_exercise', data.id)
    return data as GrammarExercise
  },

  async updateGrammarExercise(id: string, updates: Partial<GrammarExercise>): Promise<GrammarExercise> {
    const { data, error } = await supabase
      .from('grammar_exercises')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as GrammarExercise
  },

  async deleteGrammarExercise(id: string): Promise<void> {
    const { error } = await supabase
      .from('grammar_exercises')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // 8b. Lesson Blocks Management
  async listLessonBlocks(topicId: string): Promise<LessonBlock[]> {
    const { data, error } = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('topic_id', topicId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data as LessonBlock[]
  },

  async createLessonBlock(block: {
    topic_id: string
    sort_order: number
    block_type: string
    content: Record<string, unknown>
  }): Promise<LessonBlock> {
    const { data, error } = await supabase
      .from('lesson_blocks')
      .insert(block)
      .select()
      .single()

    if (error) throw error
    await this.logAction('create_lesson_block', 'lesson_block', data.id, { block_type: block.block_type })
    return data as LessonBlock
  },

  async updateLessonBlock(
    id: string,
    updates: { block_type?: string; content?: Record<string, unknown> }
  ): Promise<LessonBlock> {
    const { data, error } = await supabase
      .from('lesson_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as LessonBlock
  },

  async deleteLessonBlock(id: string): Promise<void> {
    const { error } = await supabase
      .from('lesson_blocks')
      .delete()
      .eq('id', id)

    if (error) throw error
    await this.logAction('delete_lesson_block', 'lesson_block', id, {})
  },

  async reorderLessonBlocks(topicId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('lesson_blocks')
        .update({ sort_order: i })
        .eq('id', orderedIds[i])
      if (error) throw error
    }
    await this.logAction('reorder_lesson_blocks', 'grammar_topic', topicId, { count: orderedIds.length })
  },

  // 9. Listening Management
  async listListeningTopics(): Promise<any[]> {
    const { data, error } = await supabase
      .from('listening_topics')
      .select('*')
      .order('order')
    if (error) throw error
    return data
  },

  async createListeningTopic(topic: any): Promise<any> {
    const { data, error } = await supabase
      .from('listening_topics')
      .insert(topic)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('create_listening_topic', 'listening_topic', data.id, { title: topic.title })
    return data
  },

  async updateListeningTopic(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('listening_topics')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('update_listening_topic', 'listening_topic', id, updates)
    return data
  },

  async deleteListeningTopic(id: string): Promise<void> {
    const { error } = await supabase
      .from('listening_topics')
      .delete()
      .eq('id', id)
    if (error) throw error
    await this.logAction('delete_listening_topic', 'listening_topic', id)
  },

  async listListeningTests(topicId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('listening_tests')
      .select('*')
      .eq('topic_id', topicId)
      .order('order')
    if (error) throw error
    return data
  },

  async createListeningTest(test: any): Promise<any> {
    const { data, error } = await supabase
      .from('listening_tests')
      .insert(test)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('create_listening_test', 'listening_test', data.id, { title: test.title })
    return data
  },

  async updateListeningTest(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('listening_tests')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async deleteListeningTest(id: string): Promise<void> {
    const { error } = await supabase
      .from('listening_tests')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async listListeningParts(testId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('listening_parts')
      .select('*')
      .eq('test_id', testId)
      .order('part_number')
    if (error) throw error
    return data
  },

  async createListeningPart(part: any): Promise<any> {
    const { data, error } = await supabase
      .from('listening_parts')
      .insert(part)
      .select('*')
      .single()
    if (error) throw error
    await this.logAction('create_listening_part', 'listening_part', data.id)
    return data
  },

  async updateListeningPart(id: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('listening_parts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async deleteListeningPart(id: string): Promise<void> {
    const { error } = await supabase
      .from('listening_parts')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // 10. Storage Management Stats
  async getStorageStats(): Promise<any> {
    const { count: audioCount } = await supabase
      .from('global_terms')
      .select('audio_url', { count: 'exact', head: true })
      .not('audio_url', 'is', null)
      .is('deleted_at', null)

    const { count: imageCount } = await supabase
      .from('global_terms')
      .select('image_url', { count: 'exact', head: true })
      .not('image_url', 'is', null)
      .is('deleted_at', null)

    const { count: listeningAudioCount } = await supabase
      .from('listening_parts')
      .select('audio_url', { count: 'exact', head: true })

    return {
      vocabImages: { count: imageCount ?? 0, sizeBytes: (imageCount ?? 0) * 152400 },
      audioCache: { count: audioCount ?? 0, sizeBytes: (audioCount ?? 0) * 12300 },
      listeningAudio: { count: listeningAudioCount ?? 0, sizeBytes: (listeningAudioCount ?? 0) * 3145700 },
    }
  },
}
