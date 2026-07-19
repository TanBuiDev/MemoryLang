export type ResponseLanguage = 'vi' | 'en'

const vietnameseWords = /\b(tôi|toi|bạn|ban|bao nhiêu|bao nhieu|học|hoc|từ|tu|ngữ pháp|ngu phap|có|co|không|khong|hôm nay|hom nay)\b/i
const englishWords = /\b(the|what|how|many|words?|learned?|grammar|can|i|you|today|review)\b/i
const vietnameseDiacritics = /[à-ỹđ]/i

export function detectResponseLanguage(message: string, nativeLanguage: string): ResponseLanguage {
  if (vietnameseDiacritics.test(message) || vietnameseWords.test(message)) return 'vi'
  if (englishWords.test(message)) return 'en'
  return nativeLanguage === 'en' ? 'en' : 'vi'
}
