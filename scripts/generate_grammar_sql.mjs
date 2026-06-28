import fs from 'node:fs'

const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'

const grammarEntries = [
  {
    source_text: 'S + Adv + V',
    normalized_text: 'S + Adv + V',
    item_type: 'grammar',
    part_of_speech: 'sentence structure',
    meanings: [{ text: 'Chủ ngữ + trạng từ + động từ — trạng từ bổ nghĩa cho động từ đứng ngay trước nó', language: 'vi' }],
    translation: 'trạng từ đứng trước động từ',
    examples: [
      { sentence: 'She carefully reviewed the report.', translation: 'Cô ấy đã xem xét báo cáo một cách cẩn thận.' },
      { sentence: 'The company rapidly expanded its operations.', translation: 'Công ty đã mở rộng hoạt động một cách nhanh chóng.' }
    ],
    tags: ['grammar', 'sentence-structure', 'toeic-part5'],
    note: 'Trạng từ (Adv) đứng trước động từ chính (V) để bổ nghĩa. KHÔNG đặt trạng từ giữa động từ và tân ngữ.',
    category: 'Sentence Structure'
  },
  {
    source_text: 'be + Adv + Adj',
    normalized_text: 'be + Adv + Adj',
    item_type: 'grammar',
    part_of_speech: 'sentence structure',
    meanings: [{ text: 'Động từ to be + trạng từ + tính từ — trạng từ bổ nghĩa cho tính từ', language: 'vi' }],
    translation: 'trạng từ bổ nghĩa cho tính từ',
    examples: [
      { sentence: 'She is highly qualified for the position.', translation: 'Cô ấy có trình độ cao cho vị trí này.' },
      { sentence: 'The results were surprisingly accurate.', translation: 'Kết quả chính xác một cách đáng ngạc nhiên.' }
    ],
    tags: ['grammar', 'sentence-structure', 'toeic-part5'],
    note: 'Trạng từ mức độ (very, highly, extremely, quite...) đứng trước tính từ để tăng/giảm mức độ.',
    category: 'Sentence Structure'
  },
  {
    source_text: 'as a result, + clause',
    normalized_text: 'as a result, + clause',
    item_type: 'grammar',
    part_of_speech: 'connector',
    meanings: [{ text: 'Kết quả là + mệnh đề (= consequently, therefore, hence)', language: 'vi' }],
    translation: 'kết quả là / do đó',
    examples: [
      { sentence: 'Sales dropped significantly. As a result, the company had to cut costs.', translation: 'Doanh số giảm đáng kể. Kết quả là, công ty phải cắt giảm chi phí.' }
    ],
    tags: ['grammar', 'connector', 'cause-effect', 'toeic-part6'],
    note: '"as a result, + clause" (có dấu phẩy) vs "as a result of + N/Ving" (không dấu phẩy). Đừng nhầm 2 cấu trúc.',
    category: 'Connectors'
  },
  {
    source_text: 'encourage + O + to V',
    normalized_text: 'encourage + O + to V',
    item_type: 'grammar',
    part_of_speech: 'verb pattern',
    meanings: [{ text: 'Khuyến khích ai đó làm gì (= motivate, urge)', language: 'vi' }],
    translation: 'khuyến khích ai làm gì',
    examples: [
      { sentence: 'The manager encouraged the team to share their ideas.', translation: 'Người quản lý khuyến khích nhóm chia sẻ ý tưởng của họ.' }
    ],
    tags: ['grammar', 'verb-pattern', 'toeic-part5'],
    note: 'Cấu trúc: encourage + someone + to + V. KHÔNG dùng encourage + V-ing cho nghĩa này.',
    category: 'Verb Patterns'
  },
  {
    source_text: 'be subject to + N/Ving',
    normalized_text: 'be subject to + N/Ving',
    item_type: 'grammar',
    part_of_speech: 'prepositional phrase',
    meanings: [{ text: 'Phải chịu, bị ảnh hưởng bởi (= be liable to, be prone to)', language: 'vi' }],
    translation: 'phải chịu / bị ảnh hưởng bởi',
    examples: [
      { sentence: 'All prices are subject to change without notice.', translation: 'Tất cả giá có thể thay đổi mà không cần thông báo trước.' },
      { sentence: 'The project is subject to approval by the board.', translation: 'Dự án phải được hội đồng phê duyệt.' }
    ],
    tags: ['grammar', 'preposition', 'toeic-part5', 'formal'],
    note: '"be subject to" thường dùng trong văn bản pháp lý, hợp đồng, điều khoản.',
    category: 'Prepositions'
  },
  {
    source_text: 'be accustomed to + N/Ving',
    normalized_text: 'be accustomed to + N/Ving',
    item_type: 'grammar',
    part_of_speech: 'adjective phrase',
    meanings: [{ text: 'Quen với việc gì (= be used to + N/Ving)', language: 'vi' }],
    translation: 'quen với',
    examples: [
      { sentence: 'She is accustomed to working long hours.', translation: 'Cô ấy quen với việc làm việc nhiều giờ.' }
    ],
    tags: ['grammar', 'adjective-phrase', 'toeic-part5'],
    note: '"be accustomed to + V-ing" (KHÔNG dùng to + V). Giống "be used to + V-ing".',
    category: 'Adjective Phrases'
  },
  {
    source_text: 'due to + N/Ving',
    normalized_text: 'due to + N/Ving',
    item_type: 'grammar',
    part_of_speech: 'prepositional phrase',
    meanings: [{ text: 'Bởi vì, do (= because of, owing to, on account of)', language: 'vi' }],
    translation: 'bởi vì / do',
    examples: [
      { sentence: 'The flight was delayed due to bad weather.', translation: 'Chuyến bay bị hoãn do thời tiết xấu.' },
      { sentence: 'Due to the holiday, the office will be closed.', translation: 'Do ngày lễ, văn phòng sẽ đóng cửa.' }
    ],
    tags: ['grammar', 'preposition', 'cause-effect', 'toeic-part5'],
    note: '"due to + N/Ving" = "because of + N/Ving". KHÔNG dùng "due to + clause".',
    category: 'Prepositions'
  },
  {
    source_text: 'contribute to + N/Ving',
    normalized_text: 'contribute to + N/Ving',
    item_type: 'grammar',
    part_of_speech: 'verb pattern',
    meanings: [{ text: 'Đóng góp vào, góp phần vào (= add to, play a part in)', language: 'vi' }],
    translation: 'đóng góp vào / góp phần',
    examples: [
      { sentence: 'Exercise contributes to better health.', translation: 'Tập thể dục góp phần vào sức khỏe tốt hơn.' },
      { sentence: 'The new policy contributed to reducing costs.', translation: 'Chính sách mới góp phần giảm chi phí.' }
    ],
    tags: ['grammar', 'verb-pattern', 'toeic-part5'],
    note: '"contribute to + N/Ving". KHÔNG dùng "contribute to + V".',
    category: 'Verb Patterns'
  },
  {
    source_text: 'be eligible for + N / to V',
    normalized_text: 'be eligible for + N / to V',
    item_type: 'grammar',
    part_of_speech: 'adjective phrase',
    meanings: [{ text: 'Đủ điều kiện để nhận/được làm gì (= qualify for, be entitled to)', language: 'vi' }],
    translation: 'đủ điều kiện',
    examples: [
      { sentence: 'Employees are eligible for a bonus after one year.', translation: 'Nhân viên đủ điều kiện nhận thưởng sau một năm.' },
      { sentence: 'Only members are eligible to vote.', translation: 'Chỉ thành viên mới đủ điều kiện bỏ phiếu.' }
    ],
    tags: ['grammar', 'adjective-phrase', 'toeic-part5', 'HR'],
    note: '"be eligible for + N" hoặc "be eligible to + V". Hai cấu trúc khác nhau.',
    category: 'Adjective Phrases'
  },
  {
    source_text: 'Common TOEIC Adverbs',
    normalized_text: 'common toeic adverbs',
    item_type: 'grammar',
    part_of_speech: 'adverb list',
    meanings: [
      { text: 'very (rất) · really (thực sự) · extremely (cực kỳ) · highly (rất, ở mức cao) · quite (khá) · rather (khá là) · surprisingly (đáng ngạc nhiên) · particularly (đặc biệt) · especially (đặc biệt là)', language: 'vi' },
      { text: 'greatly (rất nhiều) · sincerely (chân thành) · precisely (chính xác) · carefully (cẩn thận) · diligently (chăm chỉ) · actively (tích cực) · consistently (liên tục) · cautiously (thận trọng) · promptly (nhanh chóng) · lightly (nhẹ nhàng) · rarely (hiếm khi) · occasionally (thỉnh thoảng) · solely (chỉ, duy nhất) · prominently (nổi bật) · consecutively · successively (liên tiếp)', language: 'vi' }
    ],
    translation: 'danh sách trạng từ TOEIC phổ biến',
    examples: [
      { sentence: 'She is highly qualified and consistently exceeds expectations.', translation: 'Cô ấy có trình độ cao và liên tục vượt kỳ vọng.' }
    ],
    tags: ['grammar', 'adverb', 'reference', 'toeic-part5'],
    note: '22 trạng từ phổ biến nhất trong TOEIC. Học kèm với pattern S + Adv + V và be + Adv + Adj.',
    category: 'Adverbs'
  }
]

function esc(s) {
  if (!s) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

const tuples = grammarEntries.map(e =>
  '(' + esc(USER_ID) + ', ' + esc(e.source_text) + ', ' + esc(e.normalized_text) + ", 'en', 'vi', " +
  esc(e.item_type) + ', ' + esc(e.part_of_speech) + ', NULL, NULL, ' +
  "'" + JSON.stringify(e.meanings || []).replace(/'/g, "''") + "'::jsonb, " +
  "'" + JSON.stringify(e.examples || []).replace(/'/g, "''") + "'::jsonb, " +
  'ARRAY[' + (e.tags || []).map(t => "'" + t.replace(/'/g, "''") + "'").join(', ') + '], ' +
  esc(e.note) + ', ' + esc(e.translation) + ", 'new')"
).join(',\n')

const sql = `INSERT INTO public.user_terms (
  user_id, source_text, normalized_text, source_language, native_language,
  item_type, part_of_speech, ipa, pronunciation_text,
  meanings, examples, tags, note, translation, status
) VALUES
${tuples}
ON CONFLICT (user_id, normalized_text) DO NOTHING;`

fs.writeFileSync('scripts/grammar_import.sql', sql, 'utf-8')
console.log(`Generated ${grammarEntries.length} grammar entries → scripts/grammar_import.sql`)
