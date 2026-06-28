# KẾ HOẠCH TRIỂN KHAI HỆ THỐNG ADMIN — MemoryLang

> Ngày lập: 2026-06-26
> Trạng thái: Kế hoạch chờ duyệt

---

## 1. Phân tích hiện trạng

### Đã có

- **11 bảng DB** (RLS, user-scoped): `profiles`, `language_profiles`, `global_terms`, `user_terms`, `term_relationships`, `decks`, `deck_terms`, `flashcard_templates`, `study_sessions`, `quiz_results`, `quiz_answers`
- **3 Edge Functions**: `enrich-vocabulary`, `search-images`, `generate-audio`
- **22+ trang frontend**: dashboard, vocabulary, decks, study, quiz, review, templates, listening, grammar, settings
- **Services**: auth, vocabulary, deck, study, quiz, statistics, relationship
- **External APIs**: Supabase, Google Cloud TTS, Cloudflare R2, dictionaryapi.dev, MyMemory translation, Unsplash/Pexels/Pixabay
- **Scripts**: import-vocabulary, migrate-audio, fill-IPA, generate-grammar-SQL, sync-secrets

### Chưa có (cần Admin)

- Không có role admin, không có bảng cấu hình hệ thống
- Không có giao diện quản lý user, nội dung, API keys
- TTS voice/rate/pitch hardcode trong Edge Function (`getDefaultVoice()`, `ssmlGender: 'NEUTRAL'`, `speakingRate`/`pitch` không truyền)
- Settings audio (`speechRate`/`speechPitch` trong SettingsPage) là placeholder không hoạt động
- Listening & Grammar dùng demo data hardcoded (`features/listening/demoData.ts`)
- Bulk operations chỉ chạy qua script thủ công (`scripts/migrate-audio.ts`, `scripts/fill_all_ipa.mjs`, v.v.)
- Không có analytics tổng quan
- Không có feature flags
- i18n chỉ vi/en, không có giao diện quản lý translation

---

## 2. Kiến trúc Admin đề xuất

### 2.1 Database layer

```sql
-- Thêm vào profiles
ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Bảng cấu hình hệ thống key-value (JSONB)
CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Cấu hình giọng đọc TTS theo ngôn ngữ
CREATE TABLE tts_voice_config (
  language_code text PRIMARY KEY,   -- 'en-US', 'vi-VN'
  voice_name text NOT NULL,          -- 'en-US-Wavenet-D'
  speaking_rate numeric DEFAULT 1.0, -- 0.25 - 4.0
  pitch numeric DEFAULT 0,           -- -20 đến +20 semitones
  ssml_gender text DEFAULT 'NEUTRAL',
  audio_encoding text DEFAULT 'MP3',
  enabled boolean DEFAULT true
);

-- Bật/tắt tính năng
CREATE TABLE feature_flags (
  flag text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Quản lý nội dung listening (thay demoData)
CREATE TABLE listening_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  difficulty text DEFAULT 'intermediate',
  image_url text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE listening_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES listening_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE listening_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES listening_tests(id) ON DELETE CASCADE,
  part_number int NOT NULL,
  audio_url text NOT NULL,
  transcript text,
  questions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Quản lý nội dung grammar (thay demoData)
CREATE TABLE grammar_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  level text DEFAULT 'intermediate',
  explanation text,
  examples jsonb DEFAULT '[]',
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE grammar_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES grammar_topics(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb DEFAULT '[]',
  answer text,
  explanation text,
  created_at timestamptz DEFAULT now()
);

-- Log thao tác admin
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

### 2.2 Phân quyền

- Thêm cột `is_admin boolean` vào bảng `profiles` (mặc định `false`)
- RLS policy trên tất cả admin tables: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)`
- Route guard `AdminRoute` riêng (kiểm tra `profile.is_admin`)
- Admin route prefix: `/app/admin/*`

### 2.3 Admin Edge Function

- `admin-api` — Edge Function duy nhất cho admin operations cần service role key
- Dùng `SUPABASE_SERVICE_ROLE_KEY` + verify JWT `is_admin` trong DB
- Tránh RLS bypass trực tiếp từ client (frontend chỉ gọi `admin-api`, function thực thi service role)
- CORS chỉ cho phép domain app (không `*` như user functions)

---

## 3. Modules Admin chi tiết

### Module 1: Dashboard tổng quan

**Trang:** `/app/admin`

- Thống kê users: tổng, mới (7 ngày), active (30 ngày)
- Thống kê nội dung: tổng vocabulary, decks, grammar topics, listening tests
- Thống kê hoạt động: study sessions/ngày, quiz attempts/ngày
- Thống kê API usage: TTS calls, R2 storage, image search calls
- Biểu đồ trend (7/30 ngày)
- System health: Edge Functions status, API key status, DB size

### Module 2: Quản lý User

**Trang:** `/app/admin/users`

- Danh sách users (email, display_name, native_language, target_language, created_at, last_sign_in)
- Xem chi tiết: profile, language_profiles, vocabulary count, deck count, study history
- Ban/unban user (disable auth user qua admin-api)
- Gán/bỏ role admin
- Reset password cho user
- Xóa user (hard delete qua service role)
- Export danh sách user CSV
- Filter: theo ngôn ngữ, trạng thái, ngày đăng ký

### Module 3: Quản lý Vocabulary Library

**Trang:** `/app/admin/vocabulary`

- Quản lý `global_terms` (shared cache)
- Bulk import vocabulary từ CSV/JSON (thay `scripts/import-vocabulary.ts`)
- Bulk regenerate TTS audio (thay `scripts/migrate-audio.ts`)
- Bulk backfill IPA (thay `scripts/fill_all_ipa.mjs`)
- Edit/sửa nội dung `global_terms`
- Xóa `global_terms` không còn user nào dùng
- Thống kê: bao nhiêu user dùng mỗi term
- Filter: theo ngôn ngữ, item_type, có/không audio, có/không IPA
- Bulk operations: chọn nhiều → regenerate audio, xóa, export

### Module 4: Quản lý Grammar

**Trang:** `/app/admin/grammar`

- CRUD grammar topics (thay `features/demo/demoData.ts` cho grammar)
- CRUD grammar exercises
- Phân loại theo level (Beginner → Advanced)
- Import từ script (chuyển `scripts/generate_grammar_sql.mjs` thành UI)
- Preview bài học trước khi publish
- `is_published` flag: chỉ hiển thị cho user khi đã publish

### Module 5: Quản lý Listening

**Trang:** `/app/admin/listening`

- CRUD listening topics (thay `features/listening/demoData.ts`)
- CRUD listening tests & parts
- Upload audio file lên R2 bucket `listening-audio`
- Quản lý transcript + câu hỏi (JSONB)
- Preview bài nghe trước khi publish
- Phân loại theo difficulty
- `is_published` flag

### Module 6: Cấu hình TTS

**Trang:** `/app/admin/tts`

- Cấu hình giọng đọc mặc định theo ngôn ngữ:
  - en-US: chọn từ list WaveNet/Chirp3-HD voices (nam/nữ)
  - vi-VN, ja-JP, ko-KR, zh-CN, fr-FR, de-DE
- Cấu hình `speaking_rate` mặc định (0.25-4.0)
- Cấu hình `pitch` mặc định (-20 đến +20 semitones)
- Cấu hình `audio_encoding` (MP3/OGG/WAV)
- Test giọng đọc (nhập text → preview audio)
- Bulk regenerate cho toàn bộ vocabulary khi đổi giọng
- Quản lý R2 cache: xem số file, dung lượng, xoá cache cũ
- Quản lý credentials: Google TTS, R2 (test connection)
- Edge Function `generate-audio` đọc config từ DB thay vì hardcode

### Module 7: Quản lý API Keys & Secrets

**Trang:** `/app/admin/secrets`

- Xem trạng thái các API keys (configured/missing/masked)
- Test connection từng service:
  - Google Cloud TTS (gọi test synthesis)
  - Cloudflare R2 (HEAD bucket)
  - Unsplash/Pexels/Pixabay (search test)
  - Dictionary API
  - MyMemory Translation
- Cập nhật API key (gọi `supabase secrets set` qua admin-api)
- Sync secrets (nút chạy `sync:secrets` từ UI)
- Ẩn giá trị secret (chỉ hiện masked `••••••••`)
- Lịch sử thay đổi secrets (audit log)

### Module 8: Quản lý Storage

**Trang:** `/app/admin/storage`

- Bucket `vocabulary-images` (Supabase): số file, dung lượng, danh sách
- Bucket `english-audio-cache` (R2): số file, dung lượng
- Bucket `listening-audio` (R2): số file, dung lượng
- Dọn dẹp file orphan (không còn reference trong DB)
- Upload/quản lý brand assets
- Cấu hình cache-control per bucket
- Xóa file theo filter (theo user, theo ngày, theo bucket)

### Module 9: Quản lý Edge Functions

**Trang:** `/app/admin/functions`

- Danh sách 3 Edge Functions + trạng thái (deployed/stopped/error)
- Xem logs gần đây (gọi Supabase logs API)
- Deploy/redeploy function từ UI (gọi Supabase CLI qua admin-api)
- Cấu hình CORS origins
- Monitor: execution time, error rate, invocation count
- Cập nhật env vars/secrets cho từng function

### Module 10: Feature Flags

**Trang:** `/app/admin/features`

- Bật/tắt tính năng:
  - Listening module
  - Grammar module
  - Template builder (MVP 2)
  - Matching quiz (MVP 3)
  - Fill-blank quiz (MVP 3)
  - Google OAuth login
  - Image search
  - TTS auto-generate khi enrich
- Cấu hình default settings cho user mới:
  - `daily_goal` mặc định
  - `study mode` mặc định
  - `SRS ease factor` mặc định
  - `speech rate`/`pitch` mặc định
- Frontend đọc feature flags từ `app_settings` trên app startup

### Module 11: Quản lý i18n

**Trang:** `/app/admin/i18n`

- Danh sách translation keys (~130 keys × 2 ngôn ngữ)
- Edit translation inline (table view)
- Thêm ngôn ngữ mới (ko, ja, zh...)
- Export/import translations JSON
- Preview UI với ngôn ngữ đã chọn
- Phân loại keys theo section (vocabulary, study, quiz, settings...)

### Module 12: Audit Log

**Trang:** `/app/admin/audit`

- Log mọi thao tác admin (who, what, when, what_changed)
- Filter theo admin user, action type, date range
- Export log CSV
- Retention policy: tự động xóa log cũ hơn 90 ngày

### Module 13: Analytics chi tiết

**Trang:** `/app/admin/analytics`

- User engagement: DAU/MAU, retention curve, churn rate
- Learning metrics: avg cards/day, avg session length, completion rate
- Content popularity: top vocabulary, top decks, top grammar topics, top listening tests
- Error tracking: enrichment failures, TTS failures, image search failures
- API cost estimation: TTS chars used, R2 storage used, image API calls
- Export báo cáo CSV/PDF

---

## 4. Thứ tự ưu tiên triển khai

### Phase 1 — Nền tảng (High priority)

| # | Task | Mô tả |
|---|------|-------|
| 1 | DB migration | Thêm `is_admin` vào `profiles`, tạo `app_settings`, `feature_flags`, `admin_audit_log` |
| 2 | AdminRoute guard | Kiểm tra `profile.is_admin`, redirect nếu không phải admin |
| 3 | Admin layout + sidebar | Layout riêng, sidebar với 13 modules |
| 4 | Admin Dashboard | Thống kê tổng quan (users, content, activity) |
| 5 | Quản lý User | Xem, ban, gán admin, reset password, xóa |

### Phase 2 — Cấu hình hệ thống (High priority)

| # | Task | Mô tả |
|---|------|-------|
| 6 | Cấu hình TTS | Voice/rate/pitch per language, test giọng, bulk regenerate |
| 7 | Quản lý API Keys | Xem trạng thái, test connection, update secrets |
| 8 | Feature Flags | Bật/tắt tính năng, default settings cho user mới |
| 9 | App settings | Cấu hình default values (daily_goal, SRS, speech rate) |

### Phase 3 — Quản lý nội dung (Medium priority)

| # | Task | Mô tả |
|---|------|-------|
| 10 | Quản lý Vocabulary | Bulk operations (import, regenerate audio, backfill IPA) |
| 11 | Quản lý Grammar | CRUD topics + exercises, import, publish |
| 12 | Quản lý Listening | CRUD topics + tests + parts, upload audio, publish |
| 13 | Quản lý Storage | Buckets, cleanup orphan, cache-control |

### Phase 4 — Hoàn thiện (Lower priority)

| # | Task | Mô tả |
|---|------|-------|
| 14 | Quản lý Edge Functions | Logs, deploy, monitor, CORS config |
| 15 | Quản lý i18n | Edit translations inline, thêm ngôn ngữ |
| 16 | Audit Log | Log thao tác admin, filter, export |
| 17 | Analytics chi tiết | DAU/MAU, retention, cost estimation |

---

## 5. Technical approach

### Database changes

- Migration mới: `20260626_add_admin_system.sql`
- Thêm `is_admin` vào `profiles`
- Tạo tất cả admin tables với RLS `is_admin = true`
- Seed `feature_flags` với default values
- Seed `tts_voice_config` với current hardcoded values (en-US-Wavenet-D, vi-VN-Wavenet-A, v.v.)

### Frontend

- Route group `/app/admin/*` với `AdminRoute` guard
- Admin layout riêng (sidebar khác, không trộn với user sidebar)
- Dùng design system Neobrutalist hiện có (`neo-card`, `neo-button`, v.v.)
- Service layer mới: `src/services/supabase/admin.service.ts`
- DataTable component tái sử dụng cho tất cả list views

### Edge Function

- `admin-api` function cho operations cần service role key
- Frontend gọi `admin-api`, function verify JWT + check `is_admin` trong DB trước khi thực thi
- Operations: ban user, delete user, bulk regenerate audio, sync secrets, deploy functions

### App settings table

```sql
CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Seed defaults
INSERT INTO app_settings (key, value, description) VALUES
('default_daily_goal', '10', 'Daily goal mặc định cho user mới'),
('default_study_mode', '"two_side"', 'Study mode mặc định'),
('default_srs_ease_factor', '2.5', 'SRS ease factor mặc định'),
('default_speech_rate', '1.0', 'TTS speaking rate mặc định'),
('default_speech_pitch', '0', 'TTS pitch mặc định'),
('cors_origins', '["https://memorylang.app"]', 'CORS allowed origins');
```

### TTS config table

```sql
CREATE TABLE tts_voice_config (
  language_code text PRIMARY KEY,   -- 'en-US', 'vi-VN'
  voice_name text NOT NULL,          -- 'en-US-Wavenet-D'
  speaking_rate numeric DEFAULT 1.0, -- 0.25 - 4.0
  pitch numeric DEFAULT 0,           -- -20 đến +20 semitones
  ssml_gender text DEFAULT 'NEUTRAL',
  audio_encoding text DEFAULT 'MP3',
  enabled boolean DEFAULT true
);

-- Seed với current hardcoded values
INSERT INTO tts_voice_config (language_code, voice_name) VALUES
('en-US', 'en-US-Wavenet-D'),
('en-GB', 'en-GB-Wavenet-B'),
('vi-VN', 'vi-VN-Wavenet-A'),
('ja-JP', 'ja-JP-Wavenet-B'),
('ko-KR', 'ko-KR-Wavenet-B'),
('zh-CN', 'cmn-CN-Wavenet-B'),
('fr-FR', 'fr-FR-Wavenet-B'),
('de-DE', 'de-DE-Wavenet-B');
```

Edge Function `generate-audio` cập nhật: đọc config từ DB thay vì hardcode `getDefaultVoice()`.

---

## 6. File structure đề xuất

```
src/
  app/
    AdminRoute.tsx                # guard kiểm tra is_admin
  pages/admin/
    AdminDashboardPage.tsx        # Module 1: Dashboard tổng quan
    AdminUsersPage.tsx            # Module 2: Quản lý User
    AdminVocabularyPage.tsx       # Module 3: Vocabulary Library
    AdminGrammarPage.tsx          # Module 4: Quản lý Grammar
    AdminListeningPage.tsx        # Module 5: Quản lý Listening
    AdminTtsPage.tsx              # Module 6: Cấu hình TTS
    AdminSecretsPage.tsx          # Module 7: API Keys & Secrets
    AdminStoragePage.tsx          # Module 8: Quản lý Storage
    AdminFunctionsPage.tsx        # Module 9: Edge Functions
    AdminFeaturesPage.tsx         # Module 10: Feature Flags
    AdminI18nPage.tsx             # Module 11: Quản lý i18n
    AdminAuditPage.tsx            # Module 12: Audit Log
    AdminAnalyticsPage.tsx        # Module 13: Analytics
  services/
    supabase/
      admin.service.ts            # CRUD cho admin operations
  components/admin/
    AdminLayout.tsx               # layout riêng (sidebar + outlet)
    AdminSidebar.tsx              # sidebar 13 modules
    StatCard.tsx                  # card thống kê
    DataTable.tsx                 # table tái sử dụng
    BulkActionBar.tsx             # thanh bulk actions
    SecretField.tsx               # input masked cho secrets
    VoicePreview.tsx              # preview TTS audio
  types/
    admin.types.ts                # types cho admin tables
supabase/
  functions/
    admin-api/
      index.ts                    # service role operations
  migrations/
    20260626_add_admin_system.sql # toàn bộ admin DB schema
```

---

## 7. Routing đề xuất

```tsx
// src/app/routes.tsx — thêm admin route group
{
  element: <ProtectedRoute />,
  children: [
    {
      path: '/app',
      element: <AppLayout />,
      children: [
        // ... existing user routes
      ],
    },
    {
      element: <AdminRoute />,
      children: [
        {
          path: '/app/admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: <AdminDashboardPage /> },
            { path: 'users', element: <AdminUsersPage /> },
            { path: 'vocabulary', element: <AdminVocabularyPage /> },
            { path: 'grammar', element: <AdminGrammarPage /> },
            { path: 'listening', element: <AdminListeningPage /> },
            { path: 'tts', element: <AdminTtsPage /> },
            { path: 'secrets', element: <AdminSecretsPage /> },
            { path: 'storage', element: <AdminStoragePage /> },
            { path: 'functions', element: <AdminFunctionsPage /> },
            { path: 'features', element: <AdminFeaturesPage /> },
            { path: 'i18n', element: <AdminI18nPage /> },
            { path: 'audit', element: <AdminAuditPage /> },
            { path: 'analytics', element: <AdminAnalyticsPage /> },
          ],
        },
      ],
    },
  ],
}
```

---

## 8. Cách gán admin đầu tiên

Vì chưa có UI admin, gán admin đầu tiên bằng SQL trực tiếp:

```sql
-- Thay email của bạn
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

Sau khi có admin đầu tiên, các admin tiếp theo có thể gán qua UI `/app/admin/users`.

---

## 9. Ước tính effort

| Phase | Modules | Ước tính |
|-------|---------|----------|
| Phase 1 | DB + AdminRoute + Layout + Dashboard + Users | 3-5 ngày |
| Phase 2 | TTS config + Secrets + Feature Flags + App settings | 2-3 ngày |
| Phase 3 | Vocabulary + Grammar + Listening + Storage | 4-6 ngày |
| Phase 4 | Edge Functions + i18n + Audit + Analytics | 3-5 ngày |
| **Tổng** | **13 modules** | **12-19 ngày** |

---

## 10. Lưu ý

- Tất cả admin operations phải có audit log
- Secret values không bao giờ trả về frontend (chỉ masked)
- Admin UI tách biệt hoàn toàn với user UI (layout, sidebar, route)
- Feature flags đọc trên app startup, cache trong Zustand store
- TTS config thay đổi → Edge Function `generate-audio` đọc từ DB thay vì hardcode
- Bulk operations có progress bar và có thể cancel
- Admin pages dùng lazy load (`React.lazy`) để không tăng bundle size chính
