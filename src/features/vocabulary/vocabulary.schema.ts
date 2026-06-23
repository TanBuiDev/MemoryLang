import { z } from 'zod'

export const meaningSchema = z.object({
  text: z.string().min(1, 'Meaning is required'),
  language: z.enum(['vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'other']),
})

export const exampleSchema = z.object({
  sentence: z.string().min(1, 'Example is required'),
  translation: z.string().nullable().optional(),
})

export const vocabularyFormSchema = z.object({
  source_text: z.string().min(1, 'Word, phrase, or sentence is required'),
  source_language: z.enum(['vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'other']),
  native_language: z.enum(['vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'other']),
  item_type: z.enum(['word', 'phrase', 'idiom', 'sentence']),
  part_of_speech: z.string().nullable().optional(),
  ipa: z.string().nullable().optional(),
  audio_url: z.string().url().nullable().optional().or(z.literal('')),
  image_url: z.string().url().nullable().optional().or(z.literal('')),
  note: z.string().nullable().optional(),
  translation: z.string().nullable().optional(),
  meanings: z.array(meaningSchema).optional().default([]),
  examples: z.array(exampleSchema),
  tags: z.array(z.string()),
  deck_ids: z.array(z.string()),
})

export const vocabularyUpdateFormSchema = vocabularyFormSchema.extend({
  status: z.enum(['new', 'learning', 'familiar', 'memorized', 'difficult', 'need_review']).optional(),
  deck_ids: z.array(z.string()).optional(),
})

export type VocabularyFormValues = z.infer<typeof vocabularyFormSchema>
export type VocabularyUpdateFormValues = z.infer<typeof vocabularyUpdateFormSchema>
