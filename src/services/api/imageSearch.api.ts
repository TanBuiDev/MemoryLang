import { supabase } from '@/services/supabase/client'

export interface ImageSearchResult {
  id: string
  thumbUrl: string
  smallUrl: string
  fullUrl: string
  downloadUrl: string
  alt: string
  photographer: string
  source: 'unsplash' | 'pexels' | 'pixabay'
  attributionUrl: string
  width: number
  height: number
}

export interface ImageSearchResponse {
  results: ImageSearchResult[]
  page: number
  perPage: number
  total: number
}

export type ImageSource = 'unsplash' | 'pexels' | 'pixabay' | 'all'

export const imageSearchService = {
  async search(query: string, options?: { page?: number; perPage?: number; source?: ImageSource }): Promise<ImageSearchResponse> {
    const { data, error } = await supabase.functions.invoke<ImageSearchResponse>('search-images', {
      body: {
        query,
        page: options?.page ?? 1,
        perPage: options?.perPage ?? 20,
        source: options?.source ?? 'all',
      },
    })

    if (error) throw error
    return data ?? { results: [], page: 1, perPage: 20, total: 0 }
  },

  async   downloadAndSave(imageUrl: string, userId: string, termId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke<{ publicUrl: string }>('search-images/download', {
      body: { imageUrl, userId, termId },
    })

    if (error) throw error
    if (!data?.publicUrl) throw new Error('Failed to get public URL')
    return data.publicUrl
  },
}
