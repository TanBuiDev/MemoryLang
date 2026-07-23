export type ReadingEditorMode = 'edit' | 'preview'

interface ReadingViewTarget {
  id: string
  is_published: boolean
}

export function getAdminReadingViewPath(article: ReadingViewTarget): string {
  return article.is_published
    ? `/app/reading/${article.id}`
    : `/app/admin/reading/${article.id}/edit?preview=1`
}

export function getInitialReadingEditorMode(search: string): ReadingEditorMode {
  return new URLSearchParams(search).get('preview') === '1' ? 'preview' : 'edit'
}
