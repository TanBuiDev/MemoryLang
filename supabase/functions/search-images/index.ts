import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRequest {
  query: string
  page?: number
  perPage?: number
  source?: 'unsplash' | 'pexels' | 'pixabay' | 'all'
}

interface DownloadRequest {
  imageUrl: string
  userId: string
  termId: string
}

interface NormalizedImage {
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

async function searchUnsplash(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = Deno.env.get('UNSPLASH_ACCESS_KEY')
  if (!key) return []

  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(Math.min(perPage, 30)))

  try {
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((r: Record<string, unknown>) => ({
      id: `unsplash-${r.id}`,
      thumbUrl: String((r.urls as Record<string, string>)?.thumb ?? ''),
      smallUrl: String((r.urls as Record<string, string>)?.small ?? ''),
      fullUrl: String((r.urls as Record<string, string>)?.regular ?? ''),
      downloadUrl: String((r.urls as Record<string, string>)?.raw ?? ''),
      alt: String(r.alt_description ?? query),
      photographer: String((r.user as Record<string, string>)?.name ?? 'Unsplash'),
      source: 'unsplash' as const,
      attributionUrl: String((r.links as Record<string, string>)?.html ?? ''),
      width: Number(r.width ?? 0),
      height: Number(r.height ?? 0),
    }))
  } catch {
    return []
  }
}

async function searchPexels(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = Deno.env.get('PEXELS_API_KEY')
  if (!key) return []

  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(Math.min(perPage, 80)))

  try {
    const res = await fetch(url, { headers: { Authorization: key } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.photos ?? []).map((p: Record<string, unknown>) => ({
      id: `pexels-${p.id}`,
      thumbUrl: String((p.src as Record<string, string>)?.tiny ?? ''),
      smallUrl: String((p.src as Record<string, string>)?.small ?? ''),
      fullUrl: String((p.src as Record<string, string>)?.medium ?? ''),
      downloadUrl: String((p.src as Record<string, string>)?.original ?? ''),
      alt: String(p.alt ?? query),
      photographer: String(p.photographer ?? 'Pexels'),
      source: 'pexels' as const,
      attributionUrl: String(p.url ?? ''),
      width: Number(p.width ?? 0),
      height: Number(p.height ?? 0),
    }))
  } catch {
    return []
  }
}

async function searchPixabay(query: string, page: number, perPage: number): Promise<NormalizedImage[]> {
  const key = Deno.env.get('PIXABAY_API_KEY')
  if (!key) return []

  const url = new URL('https://pixabay.com/api/')
  url.searchParams.set('key', key)
  url.searchParams.set('q', query)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(Math.min(perPage, 200)))
  url.searchParams.set('safesearch', 'true')

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.hits ?? []).map((h: Record<string, unknown>) => ({
      id: `pixabay-${h.id}`,
      thumbUrl: String(h.previewURL ?? ''),
      smallUrl: String(h.webformatURL ?? ''),
      fullUrl: String(h.webformatURL ?? ''),
      downloadUrl: String(h.largeImageURL ?? ''),
      alt: String(h.tags ?? query),
      photographer: String(h.user ?? 'Pixabay'),
      source: 'pixabay' as const,
      attributionUrl: String(h.pageURL ?? ''),
      width: Number(h.imageWidth ?? 0),
      height: Number(h.imageHeight ?? 0),
    }))
  } catch {
    return []
  }
}

async function searchAll(query: string, page: number, perPage: number, preferredSource: string): Promise<NormalizedImage[]> {
  if (preferredSource === 'unsplash') {
    const results = await searchUnsplash(query, page, perPage)
    if (results.length > 0) return results
    const pexelsResults = await searchPexels(query, page, perPage)
    if (pexelsResults.length > 0) return pexelsResults
    return searchPixabay(query, page, perPage)
  }

  if (preferredSource === 'pexels') {
    const results = await searchPexels(query, page, perPage)
    if (results.length > 0) return results
    const unsplashResults = await searchUnsplash(query, page, perPage)
    if (unsplashResults.length > 0) return unsplashResults
    return searchPixabay(query, page, perPage)
  }

  if (preferredSource === 'pixabay') {
    const results = await searchPixabay(query, page, perPage)
    if (results.length > 0) return results
    const pexelsResults = await searchPexels(query, page, perPage)
    if (pexelsResults.length > 0) return pexelsResults
    return searchUnsplash(query, page, perPage)
  }

  const [unsplashResults, pexelsResults, pixabayResults] = await Promise.all([
    searchUnsplash(query, page, perPage),
    searchPexels(query, page, perPage),
    searchPixabay(query, page, perPage),
  ])

  const merged = [...unsplashResults, ...pexelsResults, ...pixabayResults]
  return merged.slice(0, perPage)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)

    if (url.pathname.includes('/download')) {
      const { imageUrl, userId, termId }: DownloadRequest = await request.json()

      if (!imageUrl || !userId || !termId) {
        return Response.json({ error: 'Missing imageUrl, userId, or termId' }, { status: 400, headers: corsHeaders })
      }

      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        return Response.json({ error: `Failed to download image: ${imageResponse.status}` }, { status: 400, headers: corsHeaders })
      }

      const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg'
      const ext = contentType.split('/')[1] ?? 'jpg'
      const blob = await imageResponse.blob()

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      const filePath = `${userId}/${termId}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('vocabulary-images')
        .upload(filePath, blob, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        return Response.json({ error: uploadError.message }, { status: 400, headers: corsHeaders })
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vocabulary-images')
        .getPublicUrl(filePath)

      return Response.json({ publicUrl }, { headers: corsHeaders })
    }

    const { query, page = 1, perPage = 20, source = 'all' }: SearchRequest = await request.json()

    if (!query || query.trim().length === 0) {
      return Response.json({ error: 'Query is required' }, { status: 400, headers: corsHeaders })
    }

    const results = await searchAll(query.trim(), page, perPage, source)

    return Response.json({
      results,
      page,
      perPage,
      total: results.length,
    }, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400, headers: corsHeaders },
    )
  }
})
