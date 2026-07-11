import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  if (readFileSync) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && match[2]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const TARGET_USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'; // Bùi Lê Hoàng Tấn
const DATA_FILE = resolve(__dirname, '..', 'docs', 'toeic_vocabulary.json');
const AUDIO_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-audio`;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Lỗi: Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function generateAudio(text: string): Promise<string | null> {
  try {
    const res = await fetch(AUDIO_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim(), language: 'en-US' }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  Lỗi sinh audio HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return null;
    }

    const data = (await res.json()) as { audioUrl?: string; cached?: boolean };
    return data.audioUrl ?? null;
  } catch (error) {
    console.error(`  Lỗi gọi generate-audio Edge Function cho "${text}":`, error);
    return null;
  }
}

async function main() {
  console.log('--- BẮT ĐẦU IMPORT TOEIC VOCABULARY ---');
  
  // 1. Đọc dữ liệu từ file JSON
  let vocabData: any[] = [];
  try {
    const rawData = readFileSync(DATA_FILE, 'utf-8');
    vocabData = JSON.parse(rawData);
    console.log(`Đã tải thành công ${vocabData.length} từ từ file ${DATA_FILE}`);
  } catch (err) {
    console.error('Không thể đọc file dữ liệu từ vựng:', err);
    process.exit(1);
  }

  // 2. Tìm/Tạo bộ thẻ cha "ETS TOEIC Listening 2026"
  console.log('Đang kiểm tra bộ thẻ cha...');
  let parentDeckId = '';
  const { data: existingParent, error: parentFindErr } = await supabase
    .from('decks')
    .select('id')
    .eq('name', 'ETS TOEIC Listening 2026')
    .eq('user_id', TARGET_USER_ID)
    .maybeSingle();

  if (parentFindErr) {
    console.error('Lỗi khi tìm bộ thẻ cha:', parentFindErr.message);
    process.exit(1);
  }

  if (existingParent) {
    parentDeckId = existingParent.id;
    console.log(`Đã tìm thấy bộ thẻ cha có sẵn: ID = ${parentDeckId}`);
  } else {
    console.log('Chưa có bộ thẻ cha, tiến hành tạo mới...');
    const { data: newParent, error: parentCreateErr } = await supabase
      .from('decks')
      .insert({
        user_id: TARGET_USER_ID,
        name: 'ETS TOEIC Listening 2026',
        description: 'Bộ thẻ cha chứa 10 test của ETS TOEIC Listening 2026',
        source_language: 'en',
        native_language: 'vi',
        color: '#432dd7',
        icon: 'BookOpen',
        visibility: 'private',
      })
      .select('id')
      .single();

    if (parentCreateErr || !newParent) {
      console.error('Không thể tạo bộ thẻ cha:', parentCreateErr?.message);
      process.exit(1);
    }
    parentDeckId = newParent.id;
    console.log(`Tạo bộ thẻ cha thành công: ID = ${parentDeckId}`);
  }

  // 3. Tìm/Tạo 10 bộ thẻ con "TEST 01" -> "TEST 10"
  console.log('Đang kiểm tra 10 bộ thẻ con...');
  const childDecksMap: Record<number, string> = {}; // testNum -> deckId
  for (let t = 1; t <= 10; t++) {
    const testName = `TEST ${String(t).padStart(2, '0')}`;
    const { data: existingChild, error: childFindErr } = await supabase
      .from('decks')
      .select('id')
      .eq('name', testName)
      .eq('parent_id', parentDeckId)
      .eq('user_id', TARGET_USER_ID)
      .maybeSingle();

    if (childFindErr) {
      console.error(`Lỗi khi tìm bộ thẻ con ${testName}:`, childFindErr.message);
      process.exit(1);
    }

    if (existingChild) {
      childDecksMap[t] = existingChild.id;
    } else {
      console.log(`Chưa có bộ thẻ con ${testName}, tiến hành tạo mới...`);
      const { data: newChild, error: childCreateErr } = await supabase
        .from('decks')
        .insert({
          user_id: TARGET_USER_ID,
          parent_id: parentDeckId,
          name: testName,
          description: `Danh sách từ vựng của ${testName} thuộc ETS TOEIC Listening 2026`,
          source_language: 'en',
          native_language: 'vi',
          color: '#fdc800',
          icon: 'FileText',
          visibility: 'private',
        })
        .select('id')
        .single();

      if (childCreateErr || !newChild) {
        console.error(`Không thể tạo bộ thẻ con ${testName}:`, childCreateErr?.message);
        process.exit(1);
      }
      childDecksMap[t] = newChild.id;
    }
  }
  console.log('Hoàn thành kiểm tra/tạo 10 bộ thẻ con.');

  // 4. Import và Smart Merge từ vựng
  const totalTerms = vocabData.length;
  let countCreatedGlobal = 0;
  let countUpdatedGlobal = 0;
  let countCreatedUserTerm = 0;
  let countSkippedUserTerm = 0;
  let countDeckTermsLinked = 0;

  // Thời gian gốc để tạo created_at tuần tự cho deck_terms
  const baseTime = new Date();

  for (let i = 0; i < totalTerms; i++) {
    const entry = vocabData[i];
    const testNum = Math.floor(i / 80) + 1; // 80 từ mỗi test
    const deckId = childDecksMap[testNum];
    const indexInTest = i % 80;

    if (!deckId) {
      console.error(`Lỗi: Không tìm thấy deckId cho TEST ${testNum} của từ "${entry.source_text}"`);
      continue;
    }

    const normText = normalizeText(entry.source_text);
    console.log(`[${i + 1}/${totalTerms}] Đang xử lý "${entry.source_text}" (TEST ${String(testNum).padStart(2, '0')})...`);

    // A. Tìm trong global_terms
    const { data: globalTerm, error: globalFindErr } = await supabase
      .from('global_terms')
      .select('*')
      .eq('normalized_text', normText)
      .eq('source_language', 'en')
      .eq('native_language', 'vi')
      .maybeSingle();

    if (globalFindErr) {
      console.error(`  Lỗi tìm global_term cho "${entry.source_text}":`, globalFindErr.message);
      continue;
    }

    let globalTermId = '';
    let currentAudioUrl = globalTerm?.audio_url ?? null;

    // Lấy thông tin từ meanings trong JSON
    const meaningsInJson = entry.meanings || [];
    const firstMeaning = meaningsInJson[0] || {};
    const jsonTranslation = firstMeaning.translation || '';
    const jsonPOS = meaningsInJson.map((m: any) => m.part_of_speech).filter(Boolean).join(', ');
    const allExamples: any[] = [];
    meaningsInJson.forEach((m: any) => {
      if (Array.isArray(m.examples)) {
        allExamples.push(...m.examples);
      }
    });

    if (globalTerm) {
      // B1. Đã tồn tại -> Thực hiện Smart Merge
      globalTermId = globalTerm.id;
      
      // Gộp part_of_speech
      const existingPOS = globalTerm.part_of_speech ? globalTerm.part_of_speech.split(',').map((p: string) => p.trim().toLowerCase()) : [];
      const newPOS = meaningsInJson.map((m: any) => m.part_of_speech).filter(Boolean) as string[];
      const mergedPOSSet = new Set([...existingPOS]);
      for (const pos of newPOS) {
        pos.split(',').map((p: string) => p.trim().toLowerCase()).forEach((p: string) => {
          if (p) mergedPOSSet.add(p);
        });
      }
      const mergedPOS = Array.from(mergedPOSSet).join(', ');

      // Gộp meanings
      const existingMeanings = Array.isArray(globalTerm.meanings) ? globalTerm.meanings : [];
      const mergedMeanings = [...existingMeanings];
      for (const newM of meaningsInJson) {
        const isDuplicate = existingMeanings.some((m: any) => 
          m.text.trim().toLowerCase() === newM.text.trim().toLowerCase()
        );
        if (!isDuplicate) {
          mergedMeanings.push(newM);
        }
      }

      // Gộp examples
      const existingExamples = Array.isArray(globalTerm.examples) ? globalTerm.examples : [];
      const mergedExamples = [...existingExamples];
      for (const newEx of allExamples) {
        const isDuplicate = existingExamples.some((ex: any) => 
          ex.sentence.trim().toLowerCase() === newEx.sentence.trim().toLowerCase()
        );
        if (!isDuplicate) {
          mergedExamples.push(newEx);
        }
      }

      // Gộp translation
      const existingTransList = globalTerm.translation ? globalTerm.translation.split(',').map((t: string) => t.trim().toLowerCase()) : [];
      const mergedTransSet = new Set([...existingTransList]);
      const displayTransList = globalTerm.translation ? globalTerm.translation.split(',').map((t: string) => t.trim()) : [];
      
      for (const m of meaningsInJson) {
        const transVal = m.translation || '';
        transVal.split(',').map((t: string) => t.trim()).forEach((t: string) => {
          if (t && !mergedTransSet.has(t.toLowerCase())) {
            mergedTransSet.add(t.toLowerCase());
            displayTransList.push(t);
          }
        });
      }
      const mergedTranslation = displayTransList.join(', ');

      // Kiểm tra/Tạo audio nếu thiếu
      const hasR2Audio = currentAudioUrl && (currentAudioUrl.includes('r2.dev') || currentAudioUrl.includes('builehoangtan.id.vn'));
      if (!hasR2Audio) {
        console.log(`  Từ "${entry.source_text}" thiếu audio R2, đang sinh bằng TTS...`);
        const generated = await generateAudio(entry.source_text);
        if (generated) {
          currentAudioUrl = generated;
          console.log(`  Sinh audio thành công: ${currentAudioUrl}`);
        }
      }

      // Update global_term
      const { error: updateErr } = await supabase
        .from('global_terms')
        .update({
          part_of_speech: mergedPOS || null,
          meanings: mergedMeanings,
          examples: mergedExamples,
          translation: mergedTranslation || null,
          audio_url: currentAudioUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', globalTermId);

      if (updateErr) {
        console.error(`  Lỗi cập nhật global_term cho "${entry.source_text}":`, updateErr.message);
      } else {
        countUpdatedGlobal++;
      }
    } else {
      // B2. Chưa tồn tại -> Insert mới
      // Sinh audio
      console.log(`  Từ mới "${entry.source_text}", đang sinh audio bằng TTS...`);
      const generated = await generateAudio(entry.source_text);
      if (generated) {
        currentAudioUrl = generated;
        console.log(`  Sinh audio thành công: ${currentAudioUrl}`);
      }

      const { data: newGlobal, error: insertErr } = await supabase
        .from('global_terms')
        .insert({
          source_text: entry.source_text,
          normalized_text: normText,
          source_language: 'en',
          native_language: 'vi',
          item_type: entry.item_type || 'word',
          part_of_speech: jsonPOS || null,
          ipa: entry.ipa || null,
          meanings: meaningsInJson,
          examples: allExamples,
          translation: jsonTranslation || null,
          audio_url: currentAudioUrl,
          source: 'ETS TOEIC Listening 2026',
        })
        .select('id')
        .single();

      if (insertErr || !newGlobal) {
        console.error(`  Lỗi tạo global_term mới cho "${entry.source_text}":`, insertErr?.message);
        continue;
      }
      globalTermId = newGlobal.id;
      countCreatedGlobal++;
    }

    // C. Kiểm tra/Tạo user_terms
    const { data: userTerm, error: userFindErr } = await supabase
      .from('user_terms')
      .select('id')
      .eq('user_id', TARGET_USER_ID)
      .eq('global_term_id', globalTermId)
      .maybeSingle();

    if (userFindErr) {
      console.error(`  Lỗi tìm user_term cho "${entry.source_text}":`, userFindErr.message);
      continue;
    }

    if (!userTerm) {
      const { error: userCreateErr } = await supabase
        .from('user_terms')
        .insert({
          user_id: TARGET_USER_ID,
          global_term_id: globalTermId,
          status: 'new',
          view_count: 0,
          correct_count: 0,
          wrong_count: 0,
          audio_play_count: 0,
          srs_repetition: 0,
          srs_interval_days: 0,
          srs_ease_factor: 2.5,
        });

      if (userCreateErr) {
        console.error(`  Lỗi tạo user_term cho "${entry.source_text}":`, userCreateErr.message);
      } else {
        countCreatedUserTerm++;
      }
    } else {
      countSkippedUserTerm++;
    }

    // D. Liên kết vào deck_terms với created_at tuần tự
    const createdAt = new Date(baseTime.getTime() + indexInTest * 100).toISOString();
    const { error: deckLinkErr } = await supabase
      .from('deck_terms')
      .upsert({
        deck_id: deckId,
        global_term_id: globalTermId,
        created_at: createdAt,
      }, { onConflict: 'deck_id,global_term_id' });

    if (deckLinkErr) {
      console.error(`  Lỗi liên kết deck_term cho "${entry.source_text}":`, deckLinkErr.message);
    } else {
      countDeckTermsLinked++;
    }
  }

  console.log('\n--- KẾT QUẢ IMPORT ---');
  console.log(`- Đã tạo mới trong global_terms: ${countCreatedGlobal}`);
  console.log(`- Đã Smart Merge trong global_terms: ${countUpdatedGlobal}`);
  console.log(`- Đã tạo mới trong user_terms: ${countCreatedUserTerm}`);
  console.log(`- Giữ nguyên tiến trình user_terms có sẵn: ${countSkippedUserTerm}`);
  console.log(`- Đã liên kết thành công vào deck_terms: ${countDeckTermsLinked}/${totalTerms}`);
  console.log('--- HOÀN THÀNH ---');
}

main().catch((err) => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
