import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const EXAM_SKILLS = new Set([
  'grammar',
  'signs',
  'reading',
  'cloze',
  'transformation',
  'listening',
  'writing',
  'speaking',
])
const QUESTION_TYPES = new Set(['multiple_choice', 'true_false', 'fill_blank', 'short_text'])
const RESOURCE_TYPES = new Set(['activity', 'prompt'])
const PROMPT_SKILLS = new Set(['writing', 'speaking'])
const EXAM_CATEGORIES = new Set(['TOEIC', 'IELTS', 'TOEFL', 'GENERAL'])
const ACCESS_TIERS = new Set(['free', 'pro'])
const SOURCE_PAGE_COUNT = 18

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0

export function validateB1Artifact(value) {
  const errors = []
  const warnings = []
  const counts = {
    activities: 0,
    prompts: 0,
    sections: 0,
    questions: 0,
    grammar_questions: 0,
    signs_questions: 0,
    reading_questions: 0,
    cloze_questions: 0,
    transformation_questions: 0,
    listening_questions: 0,
    writing_prompts: 0,
    speaking_prompts: 0,
    listening_activities: 0,
  }
  const sourceKeyPaths = new Map()

  const error = (path, message) => errors.push({ path, message })
  const warning = (path, message) => warnings.push({ path, message })

  const validateSourceKey = (candidate, path) => {
    if (!isNonEmptyString(candidate)) {
      error(path, 'Expected a non-empty string')
      return
    }

    const firstPath = sourceKeyPaths.get(candidate)
    if (firstPath) {
      error(path, `Duplicate source_key "${candidate}"; first used at ${firstPath}`)
      return
    }
    sourceKeyPaths.set(candidate, path)
  }

  const validateSourcePage = (candidate, path) => {
    if (!Number.isInteger(candidate) || candidate < 1 || candidate > SOURCE_PAGE_COUNT) {
      error(path, `Expected an integer from 1 to ${SOURCE_PAGE_COUNT}`)
    }
  }

  const validateMediaUrl = (candidate, path, mediaType, shouldWarn) => {
    if (candidate !== null && !isNonEmptyString(candidate)) {
      error(path, `Expected a non-empty URL string or null`)
    } else if (candidate === null && shouldWarn) {
      warning(path, `${mediaType} placeholder is null`)
    }
  }

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [{ path: '$', message: 'Expected an object' }],
      warnings,
      counts,
    }
  }

  if (!isRecord(value.source)) {
    error('source', 'Expected an object')
  } else {
    if (!isNonEmptyString(value.source.file_name)) {
      error('source.file_name', 'Expected a non-empty string')
    }
    if (value.source.page_count !== SOURCE_PAGE_COUNT) {
      error('source.page_count', `Expected ${SOURCE_PAGE_COUNT}`)
    }
    if (value.source.provenance !== undefined) {
      const provenance = value.source.provenance
      if (!isRecord(provenance)) {
        error('source.provenance', 'Expected an object')
      } else {
        if (!Number.isInteger(provenance.annotation_count) || provenance.annotation_count < 0) {
          error('source.provenance.annotation_count', 'Expected a non-negative integer')
        }
        if (!isNonEmptyString(provenance.extraction)) {
          error('source.provenance.extraction', 'Expected a non-empty string')
        }
        if (!isNonEmptyString(provenance.answer_source)) {
          error('source.provenance.answer_source', 'Expected a non-empty string')
        }
        if (!isRecord(provenance.excluded_source_numbers)) {
          error('source.provenance.excluded_source_numbers', 'Expected an object')
        } else {
          for (const [skill, numbers] of Object.entries(provenance.excluded_source_numbers)) {
            const numbersPath = `source.provenance.excluded_source_numbers.${skill}`
            if (!Array.isArray(numbers)) {
              error(numbersPath, 'Expected an array')
              continue
            }
            numbers.forEach((number, index) => {
              if (!isNonEmptyString(number)) {
                error(`${numbersPath}[${index}]`, 'Expected a non-empty string')
              }
            })
          }
        }
        if (
          provenance.notes !== undefined
          && (!Array.isArray(provenance.notes) || !provenance.notes.every(isNonEmptyString))
        ) {
          error('source.provenance.notes', 'Expected an array of non-empty strings')
        }
      }
    }
  }

  if (!isRecord(value.exam)) {
    error('exam', 'Expected an object')
  } else {
    validateSourceKey(value.exam.source_key, 'exam.source_key')
    if (!isNonEmptyString(value.exam.title)) {
      error('exam.title', 'Expected a non-empty string')
    }
    if (!Number.isFinite(value.exam.default_time_minutes) || value.exam.default_time_minutes <= 0) {
      error('exam.default_time_minutes', 'Expected a positive number')
    }
    if (value.exam.category !== undefined && !EXAM_CATEGORIES.has(value.exam.category)) {
      error('exam.category', 'Expected TOEIC, IELTS, TOEFL, or GENERAL')
    }
    if (value.exam.access_tier !== undefined && !ACCESS_TIERS.has(value.exam.access_tier)) {
      error('exam.access_tier', 'Expected free or pro')
    }
  }

  const activityKeys = new Set()
  const activitySkillsByKey = new Map()
  if (!Array.isArray(value.activities)) {
    error('activities', 'Expected an array')
  } else {
    counts.activities = value.activities.length
    value.activities.forEach((activity, activityIndex) => {
      const activityPath = `activities[${activityIndex}]`
      if (!isRecord(activity)) {
        error(activityPath, 'Expected an object')
        return
      }

      validateSourceKey(activity.source_key, `${activityPath}.source_key`)
      if (isNonEmptyString(activity.source_key)) {
        activityKeys.add(activity.source_key)
        if (EXAM_SKILLS.has(activity.skill)) {
          activitySkillsByKey.set(activity.source_key, activity.skill)
        }
      }
      if (!EXAM_SKILLS.has(activity.skill)) {
        error(`${activityPath}.skill`, 'Expected a supported exam skill')
      }
      if (!QUESTION_TYPES.has(activity.activity_type)) {
        error(`${activityPath}.activity_type`, 'Expected a supported question type')
      }
      if (!isNonEmptyString(activity.title)) {
        error(`${activityPath}.title`, 'Expected a non-empty string')
      }
      if (activity.instructions !== undefined && !isNonEmptyString(activity.instructions)) {
        error(
          `${activityPath}.instructions`,
          'Expected a non-empty string when provided',
        )
      }
      if (activity.content !== undefined && !isNonEmptyString(activity.content)) {
        error(
          `${activityPath}.content`,
          'Expected a non-empty string when provided',
        )
      }
      if (
        activity.passage !== undefined
        && activity.passage !== null
        && !isNonEmptyString(activity.passage)
      ) {
        error(
          `${activityPath}.passage`,
          'Expected a non-empty string or null when provided',
        )
      }
      validateMediaUrl(
        activity.audio_url,
        `${activityPath}.audio_url`,
        'Audio',
        activity.skill === 'listening',
      )
      if (activity.skill === 'listening') {
        counts.listening_activities += 1
      }

      if (!Array.isArray(activity.questions)) {
        error(`${activityPath}.questions`, 'Expected an array')
        return
      }

      counts.questions += activity.questions.length
      const skillCountKey = `${activity.skill}_questions`
      if (Object.hasOwn(counts, skillCountKey)) {
        counts[skillCountKey] += activity.questions.length
      }

      activity.questions.forEach((question, questionIndex) => {
        const questionPath = `${activityPath}.questions[${questionIndex}]`
        if (!isRecord(question)) {
          error(questionPath, 'Expected an object')
          return
        }

        validateSourceKey(question.source_key, `${questionPath}.source_key`)
        if (!isNonEmptyString(question.source_number)) {
          error(`${questionPath}.source_number`, 'Expected a non-empty string')
        }
        if (!QUESTION_TYPES.has(question.question_type)) {
          error(`${questionPath}.question_type`, 'Expected a supported question type')
        }
        if (!isNonEmptyString(question.prompt)) {
          error(`${questionPath}.prompt`, 'Expected a non-empty string')
        }
        validateSourcePage(question.source_page, `${questionPath}.source_page`)
        validateMediaUrl(
          question.image_url,
          `${questionPath}.image_url`,
          'Image',
          activity.skill === 'signs',
        )

        if (!Array.isArray(question.options)) {
          error(`${questionPath}.options`, 'Expected an array')
        } else {
          const optionKeys = new Set()
          question.options.forEach((option, optionIndex) => {
            const optionPath = `${questionPath}.options[${optionIndex}]`
            if (!isRecord(option)) {
              error(optionPath, 'Expected an object')
              return
            }
            if (!isNonEmptyString(option.key)) {
              error(`${optionPath}.key`, 'Expected a non-empty string')
            } else if (optionKeys.has(option.key)) {
              error(`${optionPath}.key`, `Duplicate option key "${option.key}"`)
            } else {
              optionKeys.add(option.key)
            }
            if (!isNonEmptyString(option.text)) {
              error(`${optionPath}.text`, 'Expected a non-empty string')
            }
            if (typeof option.is_correct !== 'boolean') {
              error(`${optionPath}.is_correct`, 'Expected a boolean')
            }
          })

          if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
            const correctCount = question.options.filter((option) =>
              isRecord(option) && option.is_correct === true).length
            if (correctCount !== 1) {
              error(
                `${questionPath}.options`,
                `Expected exactly one correct option, found ${correctCount}`,
              )
            }
          }
        }

        if (!Array.isArray(question.accepted_answers)) {
          error(`${questionPath}.accepted_answers`, 'Expected an array')
        } else if (!question.accepted_answers.every(isNonEmptyString)) {
          error(`${questionPath}.accepted_answers`, 'Expected only non-empty strings')
        } else if (
          question.question_type !== 'multiple_choice'
          && question.question_type !== 'true_false'
          && question.accepted_answers.length === 0
        ) {
          error(`${questionPath}.accepted_answers`, 'Expected at least one accepted answer')
        }
      })
    })
  }

  const promptKeys = new Set()
  const promptSkillsByKey = new Map()
  if (!Array.isArray(value.prompts)) {
    error('prompts', 'Expected an array')
  } else {
    counts.prompts = value.prompts.length
    value.prompts.forEach((prompt, promptIndex) => {
      const promptPath = `prompts[${promptIndex}]`
      if (!isRecord(prompt)) {
        error(promptPath, 'Expected an object')
        return
      }

      validateSourceKey(prompt.source_key, `${promptPath}.source_key`)
      if (isNonEmptyString(prompt.source_key)) {
        promptKeys.add(prompt.source_key)
        if (PROMPT_SKILLS.has(prompt.skill)) {
          promptSkillsByKey.set(prompt.source_key, prompt.skill)
        }
      }
      if (!PROMPT_SKILLS.has(prompt.skill)) {
        error(`${promptPath}.skill`, 'Expected writing or speaking')
      }
      if (!isNonEmptyString(prompt.title)) {
        error(`${promptPath}.title`, 'Expected a non-empty string')
      }
      if (!isNonEmptyString(prompt.prompt)) {
        error(`${promptPath}.prompt`, 'Expected a non-empty string')
      }
      if (prompt.instructions !== undefined && !isNonEmptyString(prompt.instructions)) {
        error(
          `${promptPath}.instructions`,
          'Expected a non-empty string when provided',
        )
      }
      if (prompt.content !== undefined && !isNonEmptyString(prompt.content)) {
        error(
          `${promptPath}.content`,
          'Expected a non-empty string when provided',
        )
      }
      validateSourcePage(prompt.source_page, `${promptPath}.source_page`)
      validateMediaUrl(prompt.image_url, `${promptPath}.image_url`, 'Image', false)
      validateMediaUrl(
        prompt.audio_url,
        `${promptPath}.audio_url`,
        'Audio',
        prompt.skill === 'listening' || prompt.skill === 'writing' || prompt.skill === 'speaking',
      )
      if (prompt.skill === 'writing') {
        counts.writing_prompts += 1
      } else if (prompt.skill === 'speaking') {
        counts.speaking_prompts += 1
      }
    })
  }

  if (!Array.isArray(value.sections)) {
    error('sections', 'Expected an array')
  } else {
    counts.sections = value.sections.length
    const sectionOrderPaths = new Map()
    value.sections.forEach((section, sectionIndex) => {
      const sectionPath = `sections[${sectionIndex}]`
      if (!isRecord(section)) {
        error(sectionPath, 'Expected an object')
        return
      }

      validateSourceKey(section.source_key, `${sectionPath}.source_key`)
      if (!EXAM_SKILLS.has(section.skill)) {
        error(`${sectionPath}.skill`, 'Expected a supported exam skill')
      }
      if (!RESOURCE_TYPES.has(section.resource_type)) {
        error(`${sectionPath}.resource_type`, 'Expected activity or prompt')
      }
      if (!isNonEmptyString(section.resource_source_key)) {
        error(`${sectionPath}.resource_source_key`, 'Expected a non-empty string')
      } else if (
        section.resource_type === 'activity'
        && !activityKeys.has(section.resource_source_key)
      ) {
        error(
          `${sectionPath}.resource_source_key`,
          `Unknown activity source_key "${section.resource_source_key}"`,
        )
      } else if (
        section.resource_type === 'prompt'
        && !promptKeys.has(section.resource_source_key)
      ) {
        error(
          `${sectionPath}.resource_source_key`,
          `Unknown prompt source_key "${section.resource_source_key}"`,
        )
      } else if (
        section.resource_type === 'activity'
        && activitySkillsByKey.has(section.resource_source_key)
        && EXAM_SKILLS.has(section.skill)
        && activitySkillsByKey.get(section.resource_source_key) !== section.skill
      ) {
        error(
          `${sectionPath}.skill`,
          `Expected skill "${activitySkillsByKey.get(section.resource_source_key)}" `
            + `to match referenced activity "${section.resource_source_key}"`,
        )
      } else if (
        section.resource_type === 'prompt'
        && promptSkillsByKey.has(section.resource_source_key)
        && EXAM_SKILLS.has(section.skill)
        && promptSkillsByKey.get(section.resource_source_key) !== section.skill
      ) {
        error(
          `${sectionPath}.skill`,
          `Expected skill "${promptSkillsByKey.get(section.resource_source_key)}" `
            + `to match referenced prompt "${section.resource_source_key}"`,
        )
      }
      if (!Number.isInteger(section.order_index) || section.order_index <= 0) {
        error(`${sectionPath}.order_index`, 'Expected a positive integer')
      } else if (sectionOrderPaths.has(section.order_index)) {
        error(
          `${sectionPath}.order_index`,
          `Duplicate order_index ${section.order_index}; first used at `
            + sectionOrderPaths.get(section.order_index),
        )
      } else {
        sectionOrderPaths.set(section.order_index, `${sectionPath}.order_index`)
      }
      if (typeof section.is_required !== 'boolean') {
        error(`${sectionPath}.is_required`, 'Expected a boolean')
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts,
  }
}

async function runCli() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error(JSON.stringify({
      valid: false,
      errors: [{ path: '$', message: 'Usage: node scripts/validate-b1-content.mjs <artifact.json>' }],
    }, null, 2))
    process.exitCode = 1
    return
  }

  try {
    const artifact = JSON.parse(await readFile(inputPath, 'utf8'))
    const result = validateB1Artifact(artifact)
    console.log(JSON.stringify(result, null, 2))
    if (!result.valid) {
      process.exitCode = 1
    }
  } catch (caught) {
    console.error(JSON.stringify({
      valid: false,
      errors: [{
        path: '$',
        message: caught instanceof Error ? caught.message : String(caught),
      }],
      warnings: [],
      counts: {},
    }, null, 2))
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli()
}
