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
  const filePath = 'docs/ETS_TOEIC_READING_2026.json';
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} not found`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log("Loaded ETS_TOEIC_READING_2026.json. Starting verification...");

  // Tạo map từ word -> meanings gốc từ file JSON
  const jsonWordsMap = new Map<string, any[]>();
  for (const [testName, words] of Object.entries(data)) {
    for (const item of (words as any[])) {
      const norm = normalizeText(item.word);
      if (!jsonWordsMap.has(norm)) {
        jsonWordsMap.set(norm, []);
      }
      jsonWordsMap.get(norm)!.push(...item.meanings);
    }
  }

  console.log(`Mapped ${jsonWordsMap.size} unique words from JSON.`);

  // Lấy danh sách các global_terms trùng khớp với các từ trong JSON
  const allNormalizedTexts = Array.from(jsonWordsMap.keys());
  
  // Do danh sách 800 từ lớn, ta query theo từng batch 100 từ
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
      
      // Nếu meanings rỗng hoặc không có ý nghĩa hợp lệ
      if (dbMeanings.length === 0) {
        const sourceNorm = term.normalized_text;
        const jsonMeanings = jsonWordsMap.get(sourceNorm);

        if (jsonMeanings && jsonMeanings.length > 0) {
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
  }

  console.log("\n========================================");
  console.log(`Restoration completed successfully!`);
  console.log(`Total words restored: ${restoredCount}`);
  if (restoredWords.length > 0) {
    console.log("Restored words list:", restoredWords.join(', '));
  } else {
    console.log("No missing meanings detected in database. All terms are healthy!");
  }
}

run().catch(console.error);
