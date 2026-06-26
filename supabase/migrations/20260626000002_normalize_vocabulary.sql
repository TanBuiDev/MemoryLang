-- 1. Chạy đoạn code PL/pgSQL để đồng bộ hóa và liên kết an toàn toàn bộ từ vựng đang có
DO $$
DECLARE
    r RECORD;
    g_id UUID;
BEGIN
    FOR r IN SELECT * FROM user_terms WHERE global_term_id IS NULL LOOP
        -- Tìm kiếm từ vựng tương ứng trong global_terms
        SELECT id INTO g_id 
        FROM global_terms 
        WHERE normalized_text = r.normalized_text 
          AND source_language = r.source_language 
          AND native_language = r.native_language 
        LIMIT 1;
        
        -- Nếu chưa tồn tại trong global_terms, copy dữ liệu từ điển sang để tạo mới
        IF g_id IS NULL THEN
            INSERT INTO global_terms (
                source_text,
                normalized_text,
                source_language,
                native_language,
                item_type,
                part_of_speech,
                ipa,
                audio_url,
                image_url,
                meanings,
                examples,
                created_at,
                updated_at
            ) VALUES (
                r.source_text,
                r.normalized_text,
                r.source_language,
                r.native_language,
                r.item_type,
                r.part_of_speech,
                r.ipa,
                r.audio_url,
                r.image_url,
                r.meanings,
                r.examples,
                r.created_at,
                r.updated_at
            ) RETURNING id INTO g_id;
        END IF;
        
        -- Liên kết từ vựng user_terms với global_terms vừa tìm được hoặc tạo mới
        UPDATE user_terms 
        SET global_term_id = g_id 
        WHERE id = r.id;
    END LOOP;
END $$;

-- 2. Đặt ràng buộc NOT NULL cho global_term_id
ALTER TABLE user_terms ALTER COLUMN global_term_id SET NOT NULL;

-- 3. Thêm ràng buộc khóa ngoại (Foreign Key)
ALTER TABLE user_terms
  ADD CONSTRAINT fk_user_terms_global_term
  FOREIGN KEY (global_term_id)
  REFERENCES global_terms(id)
  ON DELETE CASCADE;

-- 4. Loại bỏ các cột trùng lặp dữ liệu từ điển khỏi bảng user_terms để tiết kiệm dung lượng
ALTER TABLE user_terms 
  DROP COLUMN source_text,
  DROP COLUMN normalized_text,
  DROP COLUMN source_language,
  DROP COLUMN native_language,
  DROP COLUMN item_type,
  DROP COLUMN part_of_speech,
  DROP COLUMN ipa,
  DROP COLUMN audio_url,
  DROP COLUMN image_url,
  DROP COLUMN meanings,
  DROP COLUMN examples;
