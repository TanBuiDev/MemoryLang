import { describe, expect, it } from 'vitest'
import {
  getAdminReadingViewPath,
  getInitialReadingEditorMode,
} from '@/utils/adminReadingPreview'

describe('admin reading preview navigation', () => {
  it('opens published articles in the public reader', () => {
    expect(getAdminReadingViewPath({ id: 'article-1', is_published: true }))
      .toBe('/app/reading/article-1')
  })

  it('opens draft articles in the admin preview', () => {
    expect(getAdminReadingViewPath({ id: 'article-1', is_published: false }))
      .toBe('/app/admin/reading/article-1/edit?preview=1')
  })

  it('starts the editor in preview mode from the preview query', () => {
    expect(getInitialReadingEditorMode('?preview=1')).toBe('preview')
    expect(getInitialReadingEditorMode('')).toBe('edit')
  })
})
