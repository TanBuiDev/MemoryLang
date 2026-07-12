import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { normalizeText } from '../src/utils/normalizeText';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && match[2]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const files = [
    'docs/ETS_TOEIC_LISTENING_2026.json',
    'docs/ETS_TOEIC_READING_2026.json'
  ];

  // Tạo map từ word -> meanings gốc từ cả 2 file JSON
  const jsonWordsMap = new Map<string, any[]>();

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, skipping.`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Loaded ${filePath}. Mapping vocabulary...`);

    if (Array.isArray(data)) {
      // Dành cho Listening (Mảng phẳng các VocabularyItem)
      for (const item of data) {
        if (!item.source_text) continue;
        const norm = normalizeText(item.source_text);
        if (!jsonWordsMap.has(norm)) {
          jsonWordsMap.set(norm, []);
        }
        if (item.meanings && Array.isArray(item.meanings)) {
          const formatted = item.meanings.map((m: any) => ({
            text: m.text || '',
            translation: m.translation || null,
            part_of_speech: m.part_of_speech || null,
            language: m.language || 'vi',
            examples: m.examples || []
          }));
          jsonWordsMap.get(norm)!.push(...formatted);
        }
      }
    } else {
      // Dành cho Reading (Object chứa các group test)
      for (const [testName, words] of Object.entries(data)) {
        if (!Array.isArray(words)) continue;
        for (const item of words) {
          if (!item.word) continue;
          const norm = normalizeText(item.word);
          if (!jsonWordsMap.has(norm)) {
            jsonWordsMap.set(norm, []);
          }
          if (item.meanings && Array.isArray(item.meanings)) {
            const formatted = item.meanings.map((m: any) => ({
              text: m.definition_vi || '',
              translation: m.definition_vi || null,
              part_of_speech: m.part_of_speech || null,
              language: 'vi',
              examples: m.example ? [{
                sentence: m.example,
                translation: m.example_vi || null
              }] : []
            }));
            jsonWordsMap.get(norm)!.push(...formatted);
          }
        }
      }
    }
  }

  console.log(`Mapped ${jsonWordsMap.size} unique words from JSON files.`);

  const allNormalizedTexts = Array.from(jsonWordsMap.keys());
  const BATCH_SIZE = 100;
  let restoredCount = 0;
  const restoredWords: string[] = [];

  for (let i = 0; i < allNormalizedTexts.length; i += BATCH_SIZE) {
    const batchTexts = allNormalizedTexts.slice(i, i + BATCH_SIZE);
    const { data: terms, error } = await supabase
      .from('global_terms')
      .select('id, source_text, normalized_text, meanings, translation, examples')
      .in('normalized_text', batchTexts)
      .eq('source_language', 'en')
      .eq('native_language', 'vi')
      .is('deleted_at', null);

    if (error) {
      console.error("Error fetching global terms:", error);
      continue;
    }

    for (const term of (terms ?? [])) {
      const dbMeanings = term.meanings ?? [];
      const sourceNorm = term.normalized_text;
      const jsonMeanings = jsonWordsMap.get(sourceNorm);

      if (!jsonMeanings || jsonMeanings.length === 0) continue;

      // Điều kiện khôi phục:
      // 1. dbMeanings trống
      // 2. Hoặc dbMeanings thiếu nghĩa dịch tiếng Việt (translation bị rỗng ở bất kỳ meaning nào)
      const needsRestore = dbMeanings.length === 0 || 
        dbMeanings.some((m: any) => !m.translation || String(m.translation).trim() === '');

      if (needsRestore) {
        // Xây dựng lại mảng meanings chuẩn theo cấu trúc của hệ thống
        const restoredMeanings = jsonMeanings.map((m: any) => ({
          text: m.definition_vi || '',
          translation: m.definition_vi || null,
          part_of_speech: m.part_of_speech || null,
          language: 'vi',
          examples: m.example ? [{
            sentence: m.example,
            translation: m.example_vi || null
          }] : []
        }));

        const primaryTranslation = restoredMeanings.map(m => m.translation).filter(Boolean).join('; ');
        const allExamples = restoredMeanings.flatMap(m => m.examples || []);

        // Cập nhật lại vào database
        const { error: updateErr } = await supabase
          .from('global_terms')
          .update({
            meanings: restoredMeanings,
            translation: primaryTranslation || null,
            examples: allExamples
          })
          .eq('id', term.id);

        if (updateErr) {
          console.error(`Failed to restore meanings for word "${term.source_text}":`, updateErr.message);
        } else {
          restoredCount++;
          restoredWords.push(term.source_text);
          console.log(`[RESTORED] Word: "${term.source_text}" (ID: ${term.id}) successfully restored meanings.`);
        }
      }
    }
  }

  console.log("\n========================================");
  console.log(`Restoration completed successfully!`);
  console.log(`Total words restored: ${restoredCount}`);
  if (restoredWords.length > 0) {
    console.log("Restored words list:", restoredWords.join(', '));
  } else {
    console.log("No missing or corrupted meanings detected in database. All terms are healthy!");
  }
}

run().catch(console.error);
