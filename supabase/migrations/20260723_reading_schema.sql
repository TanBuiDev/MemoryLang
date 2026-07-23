-- Migration: Reading Comprehension Feature (reading_articles, reading_questions, reading_attempts, reading_highlights)

-- 1. Create reading_articles table
CREATE TABLE IF NOT EXISTS reading_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  content_html TEXT NOT NULL,              -- Rich text content
  plain_text TEXT NOT NULL,                -- Plain text for TTS & word count
  
  -- Classification
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) DEFAULT 'B1',
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  topics TEXT[] DEFAULT '{}',              -- e.g. ['Technology', 'Business']
  purpose TEXT CHECK (purpose IN ('IELTS', 'TOEFL', 'General', 'Academic')) DEFAULT 'General',
  
  -- Metadata
  word_count INTEGER NOT NULL DEFAULT 0,
  estimated_reading_time INTEGER DEFAULT 1, -- in minutes
  audio_url TEXT,                          -- TTS audio URL from Cloudflare R2
  audio_duration INTEGER,                  -- audio duration in seconds
  
  -- Access control & Publishing
  is_published BOOLEAN DEFAULT false,
  access_tier TEXT CHECK (access_tier IN ('free', 'pro')) DEFAULT 'free',
  published_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for reading_articles
CREATE INDEX IF NOT EXISTS idx_reading_articles_published ON reading_articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_articles_level ON reading_articles(cefr_level);
CREATE INDEX IF NOT EXISTS idx_reading_articles_topics ON reading_articles USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_reading_articles_access ON reading_articles(access_tier);

-- 2. Create reading_questions table
CREATE TABLE IF NOT EXISTS reading_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES reading_articles(id) ON DELETE CASCADE,
  
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')) DEFAULT 'multiple_choice',
  
  -- JSON array of options: [{"text": "Option A", "is_correct": true}, ...]
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  order_index INTEGER NOT NULL DEFAULT 1,
  points INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_questions_article ON reading_questions(article_id, order_index);

-- 3. Create reading_attempts table
CREATE TABLE IF NOT EXISTS reading_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES reading_articles(id) ON DELETE CASCADE,
  
  -- Stats & Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Quiz results
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,      -- [{question_id, selected_option, is_correct}]
  
  -- Vocabulary Interaction
  words_clicked TEXT[] DEFAULT '{}',      -- List of words user clicked during reading
  words_added_to_study TEXT[] DEFAULT '{}',-- List of words added to user_terms
  
  is_completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_attempts_user ON reading_attempts(user_id, completed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_attempts_unique ON reading_attempts(user_id, article_id);

-- 4. Create reading_highlights table
CREATE TABLE IF NOT EXISTS reading_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES reading_articles(id) ON DELETE CASCADE,
  
  text_content TEXT NOT NULL,
  color TEXT CHECK (color IN ('yellow', 'green', 'blue', 'pink')) DEFAULT 'yellow',
  note TEXT,
  
  start_offset INTEGER DEFAULT 0,
  end_offset INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_highlights_user_article ON reading_highlights(user_id, article_id);

-- 5. Row Level Security Policies

ALTER TABLE reading_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_highlights ENABLE ROW LEVEL SECURITY;

-- 5a. Data API privileges
-- RLS still controls which rows each role can access. These grants only expose
-- the required table operations through PostgREST.
REVOKE ALL ON TABLE reading_articles FROM anon, authenticated;
REVOKE ALL ON TABLE reading_questions FROM anon, authenticated;
REVOKE ALL ON TABLE reading_attempts FROM anon, authenticated;
REVOKE ALL ON TABLE reading_highlights FROM anon, authenticated;

GRANT SELECT ON TABLE reading_articles, reading_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reading_articles, reading_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reading_attempts, reading_highlights TO authenticated;

-- Articles: Public read for published articles; Admin full access
CREATE POLICY "reading_articles_public_read"
ON reading_articles FOR SELECT
TO public
USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "reading_articles_admin_all"
ON reading_articles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Questions: Public read for published articles; Admin full access
CREATE POLICY "reading_questions_public_read"
ON reading_questions FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM reading_articles 
    WHERE id = article_id AND is_published = true AND deleted_at IS NULL
  )
);

CREATE POLICY "reading_questions_admin_all"
ON reading_questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Attempts: Authenticated users manage their own attempts
CREATE POLICY "reading_attempts_user_own"
ON reading_attempts FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Highlights: Authenticated users manage their own highlights
CREATE POLICY "reading_highlights_user_own"
ON reading_highlights FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
