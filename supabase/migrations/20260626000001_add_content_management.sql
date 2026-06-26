-- Database migration cho Quản lý nội dung (Listening & Grammar) — MemoryLang
-- Ngày tạo: 2026-06-26

-- 1. Tạo các bảng cho Phân hệ Luyện nghe (Listening)
CREATE TABLE IF NOT EXISTS public.listening_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  difficulty text DEFAULT 'intermediate',
  image_url text,
  "order" int DEFAULT 1,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listening_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.listening_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  "order" int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listening_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES public.listening_tests(id) ON DELETE CASCADE,
  part_number int NOT NULL CHECK (part_number BETWEEN 1 AND 4),
  directions text,
  audio_url text NOT NULL,
  image_url text,
  transcript text,
  questions jsonb DEFAULT '[]'::jsonb, -- Mảng các câu hỏi ListeningQuestion
  created_at timestamptz DEFAULT now()
);

-- 2. Tạo các bảng cho Phân hệ Ngữ pháp (Grammar)
CREATE TABLE IF NOT EXISTS public.grammar_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  level text DEFAULT 'intermediate',
  explanation text NOT NULL,
  examples jsonb DEFAULT '[]'::jsonb, -- Mảng ví dụ [{sentence: '...', translation: '...'}]
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grammar_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.grammar_topics(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb, -- Mảng 4 lựa chọn trắc nghiệm
  answer text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

-- 3. Cấu hình RLS (Row Level Security) cho các bảng Listening
ALTER TABLE public.listening_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view published listening topics" ON public.listening_topics
  FOR SELECT TO authenticated USING (is_published = true OR public.is_admin());

CREATE POLICY "admins manage listening topics" ON public.listening_topics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "anyone can view published listening tests" ON public.listening_tests
  FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.listening_topics t 
    WHERE t.id = topic_id AND (t.is_published = true OR public.is_admin())
  ));

CREATE POLICY "admins manage listening tests" ON public.listening_tests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "anyone can view published listening parts" ON public.listening_parts
  FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.listening_tests t
    JOIN public.listening_topics top ON top.id = t.topic_id
    WHERE t.id = test_id AND (top.is_published = true OR public.is_admin())
  ));

CREATE POLICY "admins manage listening parts" ON public.listening_parts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Cấu hình RLS cho các bảng Grammar
ALTER TABLE public.grammar_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view published grammar topics" ON public.grammar_topics
  FOR SELECT TO authenticated USING (is_published = true OR public.is_admin());

CREATE POLICY "admins manage grammar topics" ON public.grammar_topics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "anyone can view grammar exercises" ON public.grammar_exercises
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.grammar_topics t
    WHERE t.id = topic_id AND (t.is_published = true OR public.is_admin())
  ));

CREATE POLICY "admins manage grammar exercises" ON public.grammar_exercises
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Seed dữ liệu Luyện nghe mẫu (đề ETS 2026 Test 1)
DO $$
DECLARE
  v_topic_id uuid := 'e0000000-0000-0000-0000-000000000001';
  v_test_id uuid := 'e0000000-0000-0000-0000-000000000002';
BEGIN
  -- Insert Topic
  INSERT INTO public.listening_topics (id, title, description, difficulty, "order", is_published)
  VALUES (v_topic_id, 'ETS 2026', 'Bộ đề TOEIC Listening ETS 2026', 'intermediate', 1, true)
  ON CONFLICT (id) DO NOTHING;

  -- Insert Test
  INSERT INTO public.listening_tests (id, topic_id, title, instructions, "order")
  VALUES (v_test_id, v_topic_id, 'Test 1', 'Bộ đề thi thử nghe TOEIC chính thức từ ETS 2026', 1)
  ON CONFLICT (id) DO NOTHING;

  -- Insert Part 1
  INSERT INTO public.listening_parts (id, test_id, part_number, directions, audio_url, image_url, questions)
  VALUES (
    'e0000000-0000-0000-0001-000000000001',
    v_test_id,
    1,
    'For each question, you will hear four statements about a picture. Select the statement that best describes the picture.',
    '/audio/listening/part1-sample.mp3',
    'https://placehold.co/600x400/1c293c/fbfbf9?text=Part+1+Sample',
    '[
      { "id": "p1q1", "order": 1, "questionText": "Look at the picture.", "options": ["The man is reading a book", "The woman is typing on a laptop", "They are having a meeting", "The people are standing in line"], "correctIndex": 2, "explanation": "The picture shows people sitting around a table having a meeting." },
      { "id": "p1q2", "order": 2, "questionText": "Look at the picture.", "options": ["The car is parked on the street", "The car is being repaired", "The car is driving on the highway", "The car is in the showroom"], "correctIndex": 0 }
    ]'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert Part 2
  INSERT INTO public.listening_parts (id, test_id, part_number, directions, audio_url, transcript, questions)
  VALUES (
    'e0000000-0000-0000-0001-000000000002',
    v_test_id,
    2,
    'You will hear a question and three responses. Choose the best response.',
    '/audio/listening/part2-sample.mp3',
    'Who is in charge of the marketing project?\nMr. Thompson has been leading it since January.\nThe deadline is next Friday.',
    '[
      { "id": "p2q1", "order": 1, "questionText": "Who is in charge of the marketing project?", "options": ["Last month", "Mr. Thompson", "In the conference room"], "correctIndex": 1 },
      { "id": "p2q2", "order": 2, "questionText": "When will the report be ready?", "options": ["By Friday afternoon", "Yes, I have it", "At the front desk"], "correctIndex": 0 },
      { "id": "p2q3", "order": 3, "questionText": "Where is the manager''s office?", "options": ["On the third floor", "Her name is Sarah", "At 3 o''clock"], "correctIndex": 0 }
    ]'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert Part 3
  INSERT INTO public.listening_parts (id, test_id, part_number, directions, audio_url, transcript, questions)
  VALUES (
    'e0000000-0000-0000-0001-000000000003',
    v_test_id,
    3,
    'You will hear conversations between two or three people. Answer three questions about each conversation.',
    '/audio/listening/part3-sample.mp3',
    'W: Hello, I''d like to inquire about the conference room booking.\nM: Certainly. Which date are you looking at?\nW: March 15th, for the whole afternoon.\nM: Let me check... Yes, Room 302 is available. Would you like me to reserve it?\nW: Yes, please. And could you arrange for a projector as well?',
    '[
      { "id": "p3q1", "order": 1, "questionText": "What does the woman want to do?", "options": ["Book a conference room", "Cancel a reservation", "Order lunch", "Schedule a flight"], "correctIndex": 0 },
      { "id": "p3q2", "order": 2, "questionText": "Which date is she looking at?", "options": ["March 5th", "March 10th", "March 15th", "March 20th"], "correctIndex": 2 },
      { "id": "p3q3", "order": 3, "questionText": "What extra equipment does she request?", "options": ["A microphone", "A projector", "A whiteboard", "A television"], "correctIndex": 1 }
    ]'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert Part 4
  INSERT INTO public.listening_parts (id, test_id, part_number, directions, audio_url, transcript, questions)
  VALUES (
    'e0000000-0000-0000-0001-000000000004',
    v_test_id,
    4,
    'You will hear short talks. Answer three questions about each talk.',
    '/audio/listening/part4-sample.mp3',
    'Good morning everyone. This is your captain speaking. We are currently flying at 35,000 feet and expect to arrive in Tokyo at approximately 3:30 PM local time. The weather in Tokyo is partly cloudy with a temperature of 18 degrees Celsius. The cabin crew will be serving refreshments shortly. Thank you for flying with us.',
    '[
      { "id": "p4q1", "order": 1, "questionText": "What is the current altitude?", "options": ["25,000 feet", "30,000 feet", "35,000 feet", "40,000 feet"], "correctIndex": 2 },
      { "id": "p4q2", "order": 2, "questionText": "What is the destination?", "options": ["Seoul", "Tokyo", "Beijing", "Bangkok"], "correctIndex": 1 },
      { "id": "p4q3", "order": 3, "questionText": "What is the temperature at the destination?", "options": ["15 degrees", "18 degrees", "21 degrees", "25 degrees"], "correctIndex": 1 }
    ]'::jsonb
  ) ON CONFLICT (id) DO NOTHING;

END $$;

-- 6. Seed dữ liệu Ngữ pháp mẫu
DO $$
DECLARE
  v_grammar_topic_id uuid := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert Grammar Topic
  INSERT INTO public.grammar_topics (id, title, category, level, explanation, examples, is_published)
  VALUES (
    v_grammar_topic_id,
    'Used to + V',
    'Verb Patterns',
    'intermediate',
    'Dùng để diễn tả một thói quen hoặc hành động đã từng xảy ra thường xuyên trong quá khứ nhưng hiện tại không còn nữa.',
    '[
      { "sentence": "I used to play soccer when I was a child.", "translation": "Tôi đã từng chơi bóng đá khi còn là một đứa trẻ." },
      { "sentence": "She used to live in London.", "translation": "Cô ấy đã từng sống ở London." }
    ]'::jsonb,
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert Grammar Exercise
  INSERT INTO public.grammar_exercises (id, topic_id, question, options, answer, explanation)
  VALUES (
    'a0000000-0000-0000-0001-000000000001',
    v_grammar_topic_id,
    'When I was young, I ________ go swimming every morning.',
    '["used to", "am used to", "use to", "get used to"]',
    'used to',
    'Diễn tả thói quen trong quá khứ đã chấm dứt ở hiện tại dùng "used to + V-infinitive".'
  ) ON CONFLICT (id) DO NOTHING;

END $$;
