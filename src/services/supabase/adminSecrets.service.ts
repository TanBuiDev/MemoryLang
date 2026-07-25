import { supabase } from '@/services/supabase/client'

export interface SecretOverviewItem {
  key_name: string
  is_configured: boolean
  masked_preview: string | null
  description: string | null
  updated_at: string
}

export interface AiModelConfigItem {
  id: string
  model_name: string
  provider: string
  description: string | null
  is_default: boolean
  is_active: boolean
  last_verified_at: string | null
  created_at: string
}

export interface KeyUsageLogItem {
  id: string
  key_name: string
  service_name: string
  model_used: string | null
  status_code: number
  response_time_ms: number
  error_message: string | null
  created_at: string
}

export const adminSecretsService = {
  /**
   * Fetches overview of configured secrets (Zero raw secret leakage)
   */
  async getSecretsOverview(): Promise<SecretOverviewItem[]> {
    const { data, error } = await supabase.rpc('get_admin_secrets_overview')
    if (error) {
      console.warn('Failed to fetch secrets overview:', error.message)
      return []
    }
    return (data || []).map((row: any) => ({
      key_name: row.key_name,
      is_configured: Boolean(row.is_configured),
      masked_preview: row.masked_preview || null,
      description: row.description || null,
      updated_at: row.updated_at,
    }))
  },

  /**
   * Securely saves an admin secret via RPC
   */
  async saveSecret(keyName: string, secretValue: string, description?: string) {
    const { data, error } = await supabase.rpc('save_admin_secret', {
      p_key_name: keyName,
      p_secret_val: secretValue,
      p_description: description || null,
    })

    if (error) throw new Error(error.message)
    return data as { ok: boolean; key_name: string; masked_preview: string; message: string }
  },

  /**
   * Securely deletes an admin secret via RPC
   */
  async deleteSecret(keyName: string) {
    const { data, error } = await supabase.rpc('delete_admin_secret', {
      p_key_name: keyName,
    })

    if (error) throw new Error(error.message)
    return data as { ok: boolean; key_name: string; message: string }
  },

  /**
   * Fetches active AI Model configurations
   */
  async getAiModels(): Promise<AiModelConfigItem[]> {
    const { data, error } = await supabase
      .from('ai_model_configs')
      .select('*')
      .order('is_default', { ascending: false })
      .order('model_name', { ascending: true })

    if (error) {
      console.warn('Failed to fetch AI models:', error.message)
      return []
    }
    return data || []
  },

  /**
   * Upserts a verified AI Model configuration (preventing duplicates)
   */
  async saveVerifiedAiModel(modelName: string, provider = 'gemini', description?: string, isDefault = false) {
    const { data, error } = await supabase.rpc('upsert_verified_ai_model', {
      p_model_name: modelName,
      p_provider: provider,
      p_description: description || null,
      p_set_default: isDefault,
    })

    if (error) throw new Error(error.message)
    return data as { ok: boolean; model_name: string; message: string }
  },

  /**
   * Fetches key usage logs and analytics
   */
  async getKeyUsageLogs(limit = 50): Promise<KeyUsageLogItem[]> {
    const { data, error } = await supabase
      .from('admin_key_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('Failed to fetch key usage logs:', error.message)
      return []
    }
    return data || []
  },
}
