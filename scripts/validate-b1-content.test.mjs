import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { validateB1Artifact } from './validate-b1-content.mjs'

function validArtifact() {
  return {
    source: {
      file_name: 'DeFull Copy.pdf',
      page_count: 18,
    },
    exam: {
      source_key: 'b1-de-full-copy',
      title: 'B1 Full Practice Test',
      default_time_minutes: 120,
      category: 'GENERAL',
      access_tier: 'free',
    },
    activities: [{
      source_key: 'signs',
      skill: 'signs',
      activity_type: 'multiple_choice',
      title: 'Signs',
      audio_url: null,
      questions: [{
        source_key: 'signs-1',
        source_number: '1',
        question_type: 'multiple_choice',
        prompt: 'PLEASE KEEP THIS DRIVEWAY ENTRANCE CLEAR',
        options: [
          { key: 'A', text: 'Always keep this door open.', is_correct: false },
          { key: 'B', text: 'Do not park in front of this entrance.', is_correct: true },
        ],
        accepted_answers: [],
        source_page: 1,
        image_url: null,
      }],
    }],
    prompts: [{
      source_key: 'writing-topic-7',
      skill: 'writing',
      title: 'Topic 7',
      prompt: 'Write an email to an employment agency.',
      source_page: 10,
      image_url: null,
      audio_url: null,
    }],
    sections: [
      {
        source_key: 'section-signs',
        skill: 'signs',
        resource_type: 'activity',
        resource_source_key: 'signs',
        order_index: 1,
        is_required: true,
      },
      {
        source_key: 'section-writing',
        skill: 'writing',
        resource_type: 'prompt',
        resource_source_key: 'writing-topic-7',
        order_index: 2,
        is_required: true,
      },
    ],
  }
}

test('rejects a duplicate source_key and reports the duplicate JSON path', () => {
  const artifact = validArtifact()
  artifact.activities[0].questions.push({
    ...structuredClone(artifact.activities[0].questions[0]),
    source_number: '102',
  })

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.deepEqual(result.errors, [{
    path: 'activities[0].questions[1].source_key',
    message: 'Duplicate source_key "signs-1"; first used at activities[0].questions[0].source_key',
  }])
})

test('rejects a multiple-choice question without exactly one correct option', () => {
  const artifact = validArtifact()
  artifact.activities[0].questions[0].options[1].is_correct = false

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'activities[0].questions[0].options'
    && error.message === 'Expected exactly one correct option, found 0'))
})

test('rejects a section that references a missing resource', () => {
  const artifact = validArtifact()
  artifact.sections[0].resource_source_key = 'missing-activity'

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'sections[0].resource_source_key'
    && error.message === 'Unknown activity source_key "missing-activity"'))
})

test('rejects duplicate section order_index values', () => {
  const artifact = validArtifact()
  artifact.sections[1].order_index = artifact.sections[0].order_index

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'sections[1].order_index'
    && error.message === 'Duplicate order_index 1; first used at sections[0].order_index'))
})

test('rejects a section whose skill differs from its referenced resource', () => {
  const artifact = validArtifact()
  artifact.sections[0].skill = 'reading'

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'sections[0].skill'
    && error.message === 'Expected skill "signs" to match referenced activity "signs"'))
})

test('rejects a prompt section whose skill differs from its resource', () => {
  const artifact = validArtifact()
  artifact.sections[1].skill = 'speaking'

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'sections[1].skill'
    && error.message === 'Expected skill "writing" '
      + 'to match referenced prompt "writing-topic-7"'))
})

test('rejects a prompt with a non-writing or non-speaking skill', () => {
  const artifact = validArtifact()
  artifact.prompts[0].skill = 'grammar'
  artifact.sections[1].skill = 'grammar'

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'prompts[0].skill'
    && error.message === 'Expected writing or speaking'))
})

test('rejects question source_page values outside the 1-18 source range', () => {
  const artifact = validArtifact()
  artifact.activities[0].questions[0].source_page = 19

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'activities[0].questions[0].source_page'
    && error.message === 'Expected an integer from 1 to 18'))
})

test('rejects prompt source_page values outside the 1-18 source range', () => {
  const artifact = validArtifact()
  artifact.prompts[0].source_page = 19

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'prompts[0].source_page'
    && error.message === 'Expected an integer from 1 to 18'))
})

test('accepts null image and audio placeholders with warnings', () => {
  const result = validateB1Artifact(validArtifact())

  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.warnings, [
    {
      path: 'activities[0].questions[0].image_url',
      message: 'Image placeholder is null',
    },
    {
      path: 'prompts[0].audio_url',
      message: 'Audio placeholder is null',
    },
  ])
})

test('rejects malformed provenance exclusion metadata', () => {
  const artifact = validArtifact()
  artifact.source.provenance = {
    annotation_count: 99,
    extraction: 'text layer and annotations',
    answer_source: 'PDF annotations',
    excluded_source_numbers: {
      signs: [11, 12, 13, 14, 15],
    },
  }

  const result = validateB1Artifact(artifact)

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) =>
    error.path === 'source.provenance.excluded_source_numbers.signs[0]'
    && error.message === 'Expected a non-empty string'))
})

const invalidOptionalContentCases = [
  {
    name: 'activity instructions with an invalid type',
    path: 'activities[0].instructions',
    mutate: (artifact) => { artifact.activities[0].instructions = 42 },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'empty activity instructions',
    path: 'activities[0].instructions',
    mutate: (artifact) => { artifact.activities[0].instructions = '' },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'activity content with an invalid type',
    path: 'activities[0].content',
    mutate: (artifact) => { artifact.activities[0].content = [] },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'empty activity content',
    path: 'activities[0].content',
    mutate: (artifact) => { artifact.activities[0].content = '  ' },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'activity passage with an invalid type',
    path: 'activities[0].passage',
    mutate: (artifact) => { artifact.activities[0].passage = {} },
    message: 'Expected a non-empty string or null when provided',
  },
  {
    name: 'empty activity passage',
    path: 'activities[0].passage',
    mutate: (artifact) => { artifact.activities[0].passage = '' },
    message: 'Expected a non-empty string or null when provided',
  },
  {
    name: 'prompt instructions with an invalid type',
    path: 'prompts[0].instructions',
    mutate: (artifact) => { artifact.prompts[0].instructions = false },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'empty prompt instructions',
    path: 'prompts[0].instructions',
    mutate: (artifact) => { artifact.prompts[0].instructions = '' },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'prompt content with an invalid type',
    path: 'prompts[0].content',
    mutate: (artifact) => { artifact.prompts[0].content = ['invalid'] },
    message: 'Expected a non-empty string when provided',
  },
  {
    name: 'empty prompt content',
    path: 'prompts[0].content',
    mutate: (artifact) => { artifact.prompts[0].content = ' ' },
    message: 'Expected a non-empty string when provided',
  },
]

for (const invalidCase of invalidOptionalContentCases) {
  test(`rejects ${invalidCase.name}`, () => {
    const artifact = validArtifact()
    invalidCase.mutate(artifact)

    const result = validateB1Artifact(artifact)

    assert.equal(result.valid, false)
    assert.ok(result.errors.some((error) =>
      error.path === invalidCase.path
      && error.message === invalidCase.message))
  })
}

test('keeps Grammar 108 aligned with the highlighted PDF answer', async () => {
  const artifact = JSON.parse(await readFile(
    new URL('../docs/data/b1-de-full-copy.json', import.meta.url),
    'utf8',
  ))
  const grammar = artifact.activities.find((activity) =>
    activity.source_key === 'grammar-use-of-english')
  const question = grammar.questions.find((candidate) => candidate.source_number === '108')
  const correctOptions = question.options.filter((option) => option.is_correct)

  assert.deepEqual(correctOptions, [{
    key: 'C',
    text: 'should have',
    is_correct: true,
  }])
})
