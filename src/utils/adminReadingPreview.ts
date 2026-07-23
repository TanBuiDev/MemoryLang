export type ReadingEditorMode = 'edit' | 'preview'

interface ReadingViewTarget {
  id: string
  is_published: boolean
}

export function getAdminReadingViewPath(article: ReadingViewTarget): string {
  return `/app/reading/${article.id}`
}

export function getInitialReadingEditorMode(search: string): ReadingEditorMode {
  return new URLSearchParams(search).get('preview') === '1' ? 'preview' : 'edit'
}
