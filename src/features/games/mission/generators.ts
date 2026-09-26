import { seededShuffle } from './curriculum'
import type { GameTerm, MissionDiagnostic, MissionQuestionType, QuestionDefinition, QuestionOption } from './mission.types'

export function normalizeMissionAnswer(value: string) {
  return value.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function questionId(type: MissionQuestionType, targetTermId: string, variant = 'default') {
  return type + ':' + targetTermId + ':' + variant
}

function hintFor(term: GameTerm) {
  const words = term.sourceText.trim().split(/\s+/).filter(Boolean)
  return { firstLetter: words.map((word) => word[0] ?? '').join(' '), wordCount: words.length, ipa: term.ipa }
}

function uniqueTranslationPool(terms: GameTerm[]) {
  const seen = new Set<string>()
  return terms.filter((term) => {
    const translation = term.translation?.trim()
    if (!translation) return false
    const normalized = normalizeMissionAnswer(translation)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function optionsFor(target: GameTerm, terms: GameTerm[], count: number, seed: string): QuestionOption[] | null {
  if (!target.translation) return null
  const targetTranslation = normalizeMissionAnswer(target.translation)
  const candidates = uniqueTranslationPool(terms).filter(
    (term) => term.globalTermId !== target.globalTermId && normalizeMissionAnswer(term.translation ?? '') !== targetTranslation,
  )
  if (candidates.length < count - 1) return null
  const distractors = seededShuffle(candidates, seed).slice(0, count - 1)
  return seededShuffle(
    [target, ...distractors].map((term) => ({ id: term.globalTermId, label: term.translation ?? '' })),
    seed + ':options',
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findExactCloze(term: GameTerm) {
  const target = term.sourceText.trim()
  if (!target) return null
  const pattern = new RegExp('(^|[^\\p{L}\\p{N}])(' + escapeRegExp(target) + ')(?=$|[^\\p{L}\\p{N}])', 'iu')
  for (let index = 0; index < term.examples.length; index += 1) {
    const sentence = term.examples[index]?.sentence?.trim()
    if (!sentence) continue
    const matches = [...sentence.matchAll(new RegExp(pattern.source, 'giu'))]
    if (matches.length !== 1) continue
    return { index, prompt: sentence.replace(pattern, (_match, prefix: string) => prefix + '______') }
  }
  return null
}

export function generateQuestion(
  type: MissionQuestionType,
  target: GameTerm,
  pool: GameTerm[],
  seed: string,
): { question: QuestionDefinition | null; diagnostic?: MissionDiagnostic } {
  const acceptedAnswers = [target.sourceText]
  if (type === 'matching' || type === 'listening_choice') {
    if (!target.translation) return { question: null, diagnostic: { code: 'MISSING_TRANSLATION', targetTermId: target.globalTermId, blocking: false, message: 'Từ chưa có bản dịch để tạo câu hỏi lựa chọn.' } }
    if (type === 'listening_choice' && !target.audioUrl?.trim()) return { question: null, diagnostic: { code: 'MISSING_AUDIO', targetTermId: target.globalTermId, blocking: false, message: 'Từ chưa có audio lưu sẵn.' } }
    if (pool.some((term) => term.globalTermId !== target.globalTermId && term.translation && normalizeMissionAnswer(term.translation) === normalizeMissionAnswer(target.translation ?? ''))) {
      return { question: null, diagnostic: { code: 'DUPLICATE_TRANSLATION', targetTermId: target.globalTermId, blocking: false, message: 'Bản dịch trùng với từ khác trong mission.' } }
    }
    const options = optionsFor(target, pool, 4, seed + ':' + type + ':' + target.globalTermId)
    if (!options) return { question: null, diagnostic: { code: 'INSUFFICIENT_DISTRACTORS', targetTermId: target.globalTermId, blocking: false, message: 'Không đủ đáp án nhiễu duy nhất.' } }
    return { question: {
      id: questionId(type, target.globalTermId),
      type,
      targetTermId: target.globalTermId,
      prompt: type === 'matching' ? target.sourceText : 'Nghe và chọn nghĩa đúng',
      acceptedAnswers: [target.translation],
      options,
      audioText: type === 'listening_choice' ? target.sourceText : undefined,
      audioUrl: type === 'listening_choice' ? target.audioUrl : undefined,
      hint: hintFor(target),
    } }
  }
  if (type === 'listening_typing') {
    if (!target.audioUrl) return { question: null, diagnostic: { code: 'MISSING_AUDIO', targetTermId: target.globalTermId, blocking: false, message: 'Từ chưa có audio lưu sẵn.' } }
    if (target.sourceText.trim().split(/\s+/).length > 6) return { question: null, diagnostic: { code: 'SOURCE_TOO_LONG', targetTermId: target.globalTermId, blocking: false, message: 'Nội dung quá dài cho bài nghe nhập từ.' } }
    return { question: { id: questionId(type, target.globalTermId), type, targetTermId: target.globalTermId, prompt: 'Nghe và nhập', acceptedAnswers, audioText: target.sourceText, audioUrl: target.audioUrl, hint: hintFor(target) } }
  }
  if (type === 'meaning_recall') {
    if (!target.translation) return { question: null, diagnostic: { code: 'MISSING_TRANSLATION', targetTermId: target.globalTermId, blocking: false, message: 'Từ chưa có bản dịch để tạo bài nhớ nghĩa.' } }
    const duplicates = pool.filter((item) => item.globalTermId !== target.globalTermId && item.translation && normalizeMissionAnswer(item.translation) === normalizeMissionAnswer(target.translation ?? ''))
    if (duplicates.length > 0) return { question: null, diagnostic: { code: 'DUPLICATE_TRANSLATION', targetTermId: target.globalTermId, blocking: false, message: 'Bản dịch trùng với từ khác trong mission.' } }
    return { question: { id: questionId(type, target.globalTermId), type, targetTermId: target.globalTermId, prompt: target.translation, acceptedAnswers, hint: hintFor(target) } }
  }
  if (type === 'context_cloze') {
    const cloze = findExactCloze(target)
    if (!cloze) return { question: null, diagnostic: { code: 'NO_EXACT_EXAMPLE_MATCH', targetTermId: target.globalTermId, blocking: false, message: 'Không có ví dụ chứa chính xác dạng từ mục tiêu.' } }
    return { question: { id: questionId(type, target.globalTermId, String(cloze.index)), type, targetTermId: target.globalTermId, prompt: cloze.prompt, acceptedAnswers, hint: hintFor(target), sourceExampleIndex: cloze.index } }
  }
  if (!target.translation?.trim() && !target.audioUrl?.trim()) return { question: null, diagnostic: { code: 'MISSING_TRANSLATION', targetTermId: target.globalTermId, blocking: false, message: 'Không có bản dịch hoặc audio để gợi ý chính tả.' } }
  if (target.sourceText.trim().split(/\s+/).length > 6) return { question: null, diagnostic: { code: 'SOURCE_TOO_LONG', targetTermId: target.globalTermId, blocking: false, message: 'Nội dung quá dài cho bài chính tả.' } }
  return { question: {
    id: questionId('spelling', target.globalTermId),
    type: 'spelling',
    targetTermId: target.globalTermId,
    prompt: target.translation || 'Nghe và viết chính xác từ',
    acceptedAnswers,
    audioText: target.translation ? undefined : target.sourceText,
    audioUrl: target.translation ? undefined : target.audioUrl,
    hint: hintFor(target),
  } }
}
