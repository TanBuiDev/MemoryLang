import type { AiTutorToolCall } from './tool-definitions.ts'

type ResponseLanguage = 'vi' | 'en'

type ToolResult = {
  name: string
  data: unknown
}

export function formatVerifiedToolResponse(input: {
  language: ResponseLanguage
  toolCalls: AiTutorToolCall[]
  results: ToolResult[]
}): string | null {
  const messages = input.results.flatMap((result, index) => {
    const toolCall = input.toolCalls[index]
    if (!toolCall || result.name !== toolCall.name) return []
    const message = formatToolResult(input.language, toolCall, result.data)
    return message ? [message] : []
  })

  return messages.length > 0 ? messages.join('\n\n') : null
}

function formatToolResult(language: ResponseLanguage, toolCall: AiTutorToolCall, data: unknown): string | null {
  if (isUnavailable(data)) return unavailableMessage(language)

  switch (toolCall.name) {
    case 'get_learning_overview':
      return formatLearningOverview(language, data)
    case 'get_review_queue':
      return formatReviewQueue(language, data)
    case 'search_my_vocabulary':
      return formatVocabularySearch(language, data)
    case 'get_deck_overview':
      return formatDeckOverview(language, data)
    case 'list_grammar_topics':
      return formatGrammarCatalog(language, data)
    case 'get_grammar_topic':
      return formatGrammarTopic(language, data)
  }
}

function formatLearningOverview(language: ResponseLanguage, data: unknown): string | null {
  if (!isRecord(data)) return null
  const total = asNumber(data.totalVocabulary)
  const memorized = asNumber(data.memorizedWords)
  const difficult = asNumber(data.difficultWords)
  const due = asNumber(data.reviewDue)
  if ([total, memorized, difficult, due].some((value) => value === null)) return null

  if (language === 'vi') {
    return `Bạn hiện có ${formatNumber(total, language)} từ vựng đang học. Trong đó có ${formatNumber(memorized, language)} từ đã ghi nhớ theo SRS, ${formatNumber(difficult, language)} từ khó và ${formatNumber(due, language)} từ cần ôn.`
  }
  return `You currently have ${formatNumber(total, language)} vocabulary terms in active study. Of these, ${formatNumber(memorized, language)} are memorized in SRS, ${formatNumber(difficult, language)} are difficult, and ${formatNumber(due, language)} are due for review.`
}

function formatReviewQueue(language: ResponseLanguage, data: unknown): string | null {
  if (!Array.isArray(data)) return null
  const terms = data.flatMap((item) => isRecord(item) && typeof item.source_text === 'string'
    ? [item.translation ? `${item.source_text} (${String(item.translation)})` : item.source_text]
    : [])
  if (terms.length === 0) return language === 'vi' ? 'Hiện không có từ nào khớp với danh sách ôn tập này.' : 'There are no words in this review queue right now.'
  return language === 'vi'
    ? `Bạn có ${formatNumber(terms.length, language)} từ cần xem lại: ${terms.join(', ')}.`
    : `You have ${formatNumber(terms.length, language)} words to review: ${terms.join(', ')}.`
}

function formatVocabularySearch(language: ResponseLanguage, data: unknown): string | null {
  if (!Array.isArray(data)) return null
  const terms = data.flatMap((item) => isRecord(item) && typeof item.source_text === 'string'
    ? [item.translation ? `${item.source_text} (${String(item.translation)})` : item.source_text]
    : [])
  if (terms.length === 0) return language === 'vi' ? 'Tôi không tìm thấy từ vựng nào phù hợp trong dữ liệu của bạn.' : 'I could not find a matching vocabulary item in your data.'
  return language === 'vi'
    ? `Tôi tìm thấy ${formatNumber(terms.length, language)} từ phù hợp: ${terms.join(', ')}.`
    : `I found ${formatNumber(terms.length, language)} matching terms: ${terms.join(', ')}.`
}

function formatDeckOverview(language: ResponseLanguage, data: unknown): string | null {
  if (!Array.isArray(data)) return null
  const decks = data.flatMap((item) => isRecord(item) && typeof item.name === 'string'
    ? [`${item.name} (${formatNumber(asNumber(item.term_count) ?? 0, language)} ${language === 'vi' ? 'từ' : 'terms'})`]
    : [])
  if (decks.length === 0) return language === 'vi' ? 'Bạn chưa có bộ từ nào.' : 'You do not have any decks yet.'
  return language === 'vi' ? `Các bộ từ của bạn: ${decks.join(', ')}.` : `Your decks: ${decks.join(', ')}.`
}

function formatGrammarCatalog(language: ResponseLanguage, data: unknown): string | null {
  if (!Array.isArray(data)) return null
  const topics = data.flatMap((item) => isRecord(item) && typeof item.title === 'string' ? [item] : [])
  if (topics.length === 0) return language === 'vi' ? 'Hiện chưa có chủ đề ngữ pháp nào bạn có thể truy cập.' : 'There are no accessible grammar topics right now.'
  const total = asNumber(topics[0].total_count) ?? topics.length
  const titles = topics.map((topic) => topic.title).join(', ')
  return language === 'vi'
    ? `Bạn hiện có thể truy cập ${formatNumber(total, language)} chủ đề ngữ pháp. Một số chủ đề là: ${titles}.`
    : `You can currently access ${formatNumber(total, language)} grammar topics. Some topics are: ${titles}.`
}

function formatGrammarTopic(language: ResponseLanguage, data: unknown): string | null {
  if (!isRecord(data) || !isRecord(data.topic) || typeof data.topic.title !== 'string') return null
  const category = typeof data.topic.category === 'string' ? data.topic.category : null
  const level = typeof data.topic.level === 'string' ? data.topic.level : null
  const details = [category, level].filter(Boolean).join(', ')
  return language === 'vi'
    ? `Tôi tìm thấy bài ngữ pháp “${data.topic.title}”${details ? ` (${details})` : ''}.`
    : `I found the grammar lesson “${data.topic.title}”${details ? ` (${details})` : ''}.`
}

function unavailableMessage(language: ResponseLanguage): string {
  return language === 'vi'
    ? 'Tôi chưa thể xác thực dữ liệu này lúc này.'
    : 'I cannot verify this data right now.'
}

function formatNumber(value: number, language: ResponseLanguage): string {
  return new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(value)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isUnavailable(value: unknown): boolean {
  return isRecord(value) && value.available === false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
