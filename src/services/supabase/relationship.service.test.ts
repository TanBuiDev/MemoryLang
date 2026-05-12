import { describe, expect, it, vi } from 'vitest'
import { createEmptyRelationshipGroups, isBidirectionalRelationType, relationshipService } from '@/services/supabase/relationship.service'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: mocks.from,
  },
}))

describe('relationshipService auto-direction helpers', () => {
  it.each(['synonym', 'antonym', 'related'] as const)('creates two rows for %s', async (relationType) => {
    mocks.upsert.mockResolvedValueOnce({ error: null })
    mocks.from.mockReturnValueOnce({ upsert: mocks.upsert })

    await relationshipService.createAuto('source-id', 'target-id', relationType)

    expect(mocks.upsert).toHaveBeenCalledWith(
      [
        { source_id: 'source-id', target_id: 'target-id', relation_type: relationType },
        { source_id: 'target-id', target_id: 'source-id', relation_type: relationType },
      ],
      { onConflict: 'source_id,target_id,relation_type', ignoreDuplicates: true },
    )
    expect(isBidirectionalRelationType(relationType)).toBe(true)
  })

  it.each(['derivative', 'collocation', 'idiom'] as const)('creates one row for %s', async (relationType) => {
    mocks.upsert.mockResolvedValueOnce({ error: null })
    mocks.from.mockReturnValueOnce({ upsert: mocks.upsert })

    await relationshipService.createAuto('source-id', 'target-id', relationType)

    expect(mocks.upsert).toHaveBeenCalledWith(
      [{ source_id: 'source-id', target_id: 'target-id', relation_type: relationType }],
      { onConflict: 'source_id,target_id,relation_type', ignoreDuplicates: true },
    )
    expect(isBidirectionalRelationType(relationType)).toBe(false)
  })

  it('returns all six relationship groups when empty', () => {
    expect(Object.keys(createEmptyRelationshipGroups()).sort()).toEqual([
      'antonym',
      'collocation',
      'derivative',
      'idiom',
      'related',
      'synonym',
    ])
  })
})
