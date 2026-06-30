-- Migration: Thêm cấu hình từ loại và giới hạn ví dụ vào app_settings
-- Ngày tạo: 2026-06-30

INSERT INTO public.app_settings (key, value, description) VALUES
  ('vocabulary_pos_options', 
   '[{"value": "noun", "label": "Noun"}, {"value": "verb", "label": "Verb"}, {"value": "adjective", "label": "Adjective"}, {"value": "adverb", "label": "Adverb"}, {"value": "phrase", "label": "Phrase"}, {"value": "idiom", "label": "Idiom"}, {"value": "sentence", "label": "Sentence"}, {"value": "__other__", "label": "Khác..."}]'::jsonb, 
   'Danh sách các tùy chọn từ loại hiển thị trong dropdown trang chi tiết từ vựng'),
  ('vocabulary_max_examples_count',
   '10'::jsonb,
   'Số lượng câu ví dụ tối đa được phép thêm cho mỗi từ vựng')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
