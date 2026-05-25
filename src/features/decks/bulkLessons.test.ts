import { describe, expect, it } from 'vitest'
import { buildLessonBatch, getNextLessonNumber } from '@/features/decks/bulkLessons'

describe('getNextLessonNumber', () => {
  it('continues only lesson names matching the generated naming pattern', () => {
    expect(getNextLessonNumber([
      { name: 'Bai hoc 01' },
      { name: 'Bai hoc 05' },
      { name: 'Travel 99' },
      { name: 'Bai hoc 06 notes' },
    ])).toBe(6)
  })

  it('rejects generated lesson numbers that cannot be incremented safely', () => {
    expect(() => getNextLessonNumber([
      { name: 'Bai hoc 05' },
      { name: 'Bai hoc 9007199254740991' },
    ])).toThrow('lesson number range')
  })
})

describe('buildLessonBatch', () => {
  it('shuffles then chunks unique selected term ids without losing or repeating ids', () => {
    const sourceTermIds = ['term-1', 'term-2', 'term-3', 'term-4', 'term-5']
    const batch = buildLessonBatch(
      ['term-1', 'term-2', 'term-3', 'term-2', 'term-4', 'term-5'],
      2,
      [{ name: 'Bai hoc 02' }],
      () => 0,
    )
    const flattenedTermIds = batch.flatMap((lesson) => lesson.termIds)

    expect(batch.map((lesson) => lesson.name)).toEqual(['Bai hoc 03', 'Bai hoc 04', 'Bai hoc 05'])
    expect(batch.map((lesson) => lesson.termIds.length)).toEqual([2, 2, 1])
    expect(flattenedTermIds).toEqual(['term-2', 'term-3', 'term-4', 'term-5', 'term-1'])
    expect(flattenedTermIds).not.toEqual(sourceTermIds)
    expect([...flattenedTermIds].sort()).toEqual(sourceTermIds)
  })

  it('creates one lesson when the limit exceeds selected vocabulary count', () => {
    expect(buildLessonBatch(['term-1', 'term-2'], 20, [], () => 0)).toHaveLength(1)
  })

  it('does not validate lesson numbering when no lessons will be created', () => {
    expect(buildLessonBatch([], 10, [{ name: 'Bai hoc 9007199254740991' }])).toEqual([])
  })

  it('rejects a batch whose generated lesson numbers exceed the safe range', () => {
    expect(() => buildLessonBatch(
      ['a'],
      1,
      [
        { name: 'Bai hoc 9007199254740990' },
        { name: 'Bai hoc 9007199254740991' },
      ],
      () => 0,
    )).toThrow('lesson number range')
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid words-per-lesson values: %s', (limit) => {
    expect(() => buildLessonBatch(['term-1'], limit, [])).toThrow('wordsPerLesson')
  })
})
