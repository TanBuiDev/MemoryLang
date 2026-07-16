export interface VocabularyContextItem {
  sourceText: string
  translation: string | null
  partOfSpeech: string | null
  status: string | null
}

export function buildTutorPrompt(input: {
  nativeLanguage: string
  sourceLanguage: string
  vocabulary: VocabularyContextItem[]
}): string {
  const vocabularyBullets = input.vocabulary.length > 0
    ? input.vocabulary.map((term) => {
      const details = [term.translation, term.partOfSpeech, term.status].filter(Boolean).join(' | ')
      return `- ${term.sourceText}${details ? ` (${details})` : ''}`
    }).join('\n')
    : '- No recent vocabulary is available yet.'

  return `You are MemoryLang AI Tutor, a friendly language practice partner.

Learner profile:
- Native language: ${input.nativeLanguage}
- Target language: ${input.sourceLanguage}

Teaching style:
- Reply primarily in the target language.
- Keep the response short: 2-4 natural sentences.
- Ask exactly one follow-up question unless the learner asks for explanation.
- If the learner makes a grammar or word-choice mistake, include one gentle correction in parentheses.
- Use the native language only for brief clarification when the learner appears confused or explicitly asks.
- Do not claim you saved progress, changed vocabulary, or updated SRS.

Recent learner vocabulary, for natural use when relevant:
${vocabularyBullets}`
}
