import { supabase } from '@/services/supabase/client'
import { db, type QuickNoteRecord } from '@/services/local/studyLocalDb'

export interface QuickNote {
  id: string
  user_id: string
  content: string
  tags: string[]
  linked_vocab_id?: string
  created_at: string
  updated_at: string
}

export const notesService = {
  async getNotes(userId: string): Promise<QuickNote[]> {
    // 1. Fetch from local Dexie first (Offline support)
    const localNotes = await db.quickNotes.where('userId').equals(userId).toArray()
    
    // Sort local notes by updatedAt desc
    const sortedLocal = localNotes.map((n: QuickNoteRecord) => ({
      id: n.id,
      user_id: n.userId,
      content: n.content,
      tags: n.tags,
      linked_vocab_id: n.linkedVocabId,
      created_at: n.createdAt,
      updated_at: n.updatedAt
    })).sort((a: QuickNote, b: QuickNote) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    // 2. If online and auth exists, sync with Supabase
    try {
      const { data: remoteNotes, error } = await supabase
        .from('quick_notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (remoteNotes) {
        // Sync remote notes to local Dexie
        await db.transaction('rw', db.quickNotes, async () => {
          // Clear current local user notes to prevent duplicates/stale data
          await db.quickNotes.where('userId').equals(userId).delete()
          
          const records: QuickNoteRecord[] = remoteNotes.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            content: n.content,
            tags: n.tags || [],
            linkedVocabId: n.linked_vocab_id || undefined,
            createdAt: n.created_at,
            updatedAt: n.updated_at
          }))
          
          await db.quickNotes.bulkPut(records)
        })

        return remoteNotes as QuickNote[]
      }
    } catch (e) {
      console.warn('Failed to fetch/sync notes from Supabase, using local notes instead:', e)
    }

    return sortedLocal
  },

  async saveNote(note: {
    id?: string
    userId: string
    content: string
    tags: string[]
    linkedVocabId?: string
  }): Promise<QuickNote> {
    const id = note.id || crypto.randomUUID()
    const now = new Date().toISOString()

    const localRecord: QuickNoteRecord = {
      id,
      userId: note.userId,
      content: note.content,
      tags: note.tags,
      linkedVocabId: note.linkedVocabId,
      createdAt: now,
      updatedAt: now
    }

    // 1. Save to local Dexie
    await db.quickNotes.put(localRecord)

    // 2. Sync to Supabase if online
    try {
      const { data, error } = await supabase
        .from('quick_notes')
        .upsert({
          id,
          user_id: note.userId,
          content: note.content,
          tags: note.tags,
          linked_vocab_id: note.linkedVocabId || null,
          updated_at: now
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        return data as QuickNote
      }
    } catch (e) {
      console.warn('Failed to sync saved note to Supabase, saved locally:', e)
    }

    return {
      id,
      user_id: note.userId,
      content: note.content,
      tags: note.tags,
      linked_vocab_id: note.linkedVocabId,
      created_at: now,
      updated_at: now
    }
  },

  async deleteNote(id: string, userId: string): Promise<boolean> {
    // 1. Delete from local Dexie
    await db.quickNotes.delete(id)

    // 2. Sync to Supabase
    try {
      const { error } = await supabase
        .from('quick_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (e) {
      console.warn('Failed to sync deleted note to Supabase, deleted locally:', e)
      return true
    }
  }
}
