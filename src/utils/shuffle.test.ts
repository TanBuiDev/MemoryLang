import { describe, expect, it } from 'vitest'
import { shuffle } from '@/utils/shuffle'

describe('shuffle', () => {
  it('returns the same members without mutating the original array', () => {
    const input = [1, 2, 3]
    const output = shuffle(input, () => 0)

    expect(output.sort()).toEqual([1, 2, 3])
    expect(input).toEqual([1, 2, 3])
  })
})
