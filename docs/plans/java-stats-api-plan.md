# Plan: Java Statistics & Recommendation API

## Mục tiêu

Xây dựng một microservice Java Spring Boot độc lập cung cấp API phân tích học tập và gợi ý từ vựng cho MemoryLang. Đây là bridge project cho CV Java Engineer, nhưng phải bám đúng schema Supabase và hành vi frontend hiện tại để có thể tích hợp thật sau này.

### Mục tiêu CV
- Spring Boot 3 + Java 21 (virtual threads, records, sealed classes)
- Spring Data JPA + PostgreSQL JDBC (direct connection, HikariCP)
- REST API design (proper endpoints, DTOs, error handling, pagination)
- SQL analytics (window functions, CTEs, aggregations, FILTER clauses)
- Recommendation algorithm (content-based filtering)
- JWT authentication (verify Supabase tokens; RS256/JWKS when project uses asymmetric signing)
- Docker deployment
- Google Cloud Run deployment (scale to zero, free-trial friendly)
- Testing (JUnit 5, Mockito, MockMvc, Testcontainers)
- API documentation (OpenAPI/Swagger)

### Mục tiêu sản phẩm
- Cung cấp analytics nâng cao mà frontend hiện chưa có: streaks, heatmap, learning curves
- Gợi ý từ vựng thông minh dựa trên pattern học tập của user
- SRS health monitoring và forecast ôn tập
- Quiz analytics aggregate dựa trên `quiz_results`; per-term/most-failed chỉ bật sau khi frontend ghi `quiz_answers`

### Ngoài phạm vi MVP Java
- Không thay thế Supabase service layer hiện tại của React app.
- Không ghi dữ liệu học tập, không cập nhật SRS, không tạo từ vựng/deck.
- Không triển khai per-question quiz analytics cho translation-input cho đến khi frontend gửi `quiz_answers`.
- Không dùng service-role key hoặc PostgreSQL superuser trong ứng dụng runtime.

---

## Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Language | Java 21 (LTS) — virtual threads, records, sealed classes, pattern matching |
| Framework | Spring Boot 3.3.x |
| ORM | Spring Data JPA + Hibernate |
| Database | PostgreSQL 17 (Supabase, direct JDBC via read-only role) |
| Connection Pool | HikariCP |
| Auth | Supabase JWT verification (prefer RS256/JWKS; verify actual project alg during setup) |
| Build | Maven |
| Testing | JUnit 5, Mockito, MockMvc, Testcontainers |
| Docs | springdoc-openapi (Swagger UI) |
| Container | Docker + docker-compose |
| Optional cloud demo | Google Cloud Run, Artifact Registry, Secret Manager |

---

## Kiến trúc tổng quan

```
[MemoryLang React Frontend]
    ↓ HTTP (JWT in Authorization header)
[Spring Boot API: localhost:8080/api/v1 or Cloud Run URL]
    ├── Auth filter (verify Supabase JWT via JWKS)
    ├── Statistics endpoints (read-only analytics)
    ├── Recommendation endpoints (algorithm-based suggestions)
    └── JDBC → PostgreSQL (Supabase DB, HikariCP pool)
```

### Key design decisions

- **Read-only access**: API chỉ đọc từ DB Supabase, không ghi. Schema được quản lý bởi Supabase migrations. `ddl-auto: none`.
- **Least-privilege JDBC**: Kết nối PostgreSQL bằng role read-only riêng, không dùng `postgres`, `service_role`, hoặc role có `bypassrls`. Mọi query vẫn phải filter theo user từ JWT.
- **Direct JDBC + native SQL**: Dùng Spring Data JPA cho repository boundary, nhưng analytics phức tạp ưu tiên native SQL/`JdbcTemplate` để thể hiện CTE, window functions, FILTER clauses rõ ràng.
- **Stateless auth**: Verify JWT mỗi request, không lưu session server-side. Bước setup phải kiểm tra token `alg` thực tế của Supabase project trước khi chốt RS256/JWKS hay fallback khác.
- **Schema snapshot first**: Trước khi viết entity, tạo snapshot schema từ remote/local Supabase hiện hành vì migrations cũ và code hiện tại đã lệch ở `deck_terms`, `user_terms`, `global_terms`.
- **Separate repo**: Project nằm ngoài MemoryLang repo (`memorylang-stats-api/`), là microservice độc lập.
- **Integration optional**: Frontend integration là phase sau; Java API standalone vẫn đủ cho CV nếu có test và Swagger rõ.
- **Cost-controlled Google Cloud demo**: Nếu tận dụng Google Cloud free trial, deploy bằng Cloud Run với `min instances = 0`, `max instances = 1-2`, không dùng VM/GKE/Cloud SQL. Service có thể tắt sau demo/interview.

---

## Project Structure

```
memorylang-stats-api/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── cloudbuild.yaml
├── .env.example
├── README.md
├── src/main/java/com/memorylang/stats/
│   ├── MemoryLangStatsApplication.java       # @SpringBootApplication, virtual threads
│   ├── config/
│   │   ├── SecurityConfig.java               # JWT filter chain, public/protected routes
│   │   ├── JpaConfig.java                    # HikariCP, JPA properties
│   │   └── OpenApiConfig.java                # Swagger/OpenAPI docs config
│   ├── auth/
│   │   ├── SupabaseJwtFilter.java            # JWT verification filter
│   │   ├── SupabaseJwtVerifier.java          # JWT alg detection + RS256/JWKS verification path
│   │   └── AuthUser.java                     # record: UUID userId, String email
│   ├── controller/
│   │   ├── StreakController.java             # /api/v1/streaks/**
│   │   ├── MasteryController.java            # /api/v1/mastery/**
│   │   ├── DeckController.java               # /api/v1/decks/analytics/**
│   │   ├── RecommendationController.java     # /api/v1/recommendations/**
│   │   ├── QuizController.java               # /api/v1/quiz/analytics/**
│   │   └── SrsController.java                # /api/v1/srs/**
│   ├── service/
│   │   ├── StreakService.java
│   │   ├── MasteryService.java
│   │   ├── DeckAnalyticsService.java
│   │   ├── RecommendationService.java
│   │   ├── QuizAnalyticsService.java
│   │   └── SrsHealthService.java
│   ├── repository/
│   │   ├── AnalyticsJdbcRepository.java      # native SQL analytics via JdbcTemplate
│   │   ├── StudySessionRepository.java       # JPA repository for simple reads
│   │   ├── UserTermRepository.java
│   │   ├── QuizResultRepository.java
│   │   ├── DeckRepository.java
│   │   ├── DeckTermRepository.java
│   │   └── GlobalTermRepository.java
│   ├── dto/
│   │   ├── StreakDto.java                    # record
│   │   ├── ActivityHeatmapDto.java           # record
│   │   ├── MasteryDistributionDto.java       # record
│   │   ├── EaseFactorDistributionDto.java    # record
│   │   ├── MasteryTrajectoryDto.java         # record
│   │   ├── DeckCompletionDto.java            # record
│   │   ├── DeckEngagementDto.java            # record
│   │   ├── RecommendationDto.java            # record
│   │   ├── QuizSummaryDto.java              # record
│   │   ├── TermPerformanceDto.java           # record
│   │   ├── FailedQuestionDto.java           # record
│   │   ├── SrsHealthDto.java                # record
│   │   ├── SrsForecastDto.java             # record
│   │   ├── SrsDifficultyDto.java           # record
│   │   └── ErrorResponse.java               # record: timestamp, status, message, path
│   ├── entity/
│   │   ├── StudySession.java                # @Entity → study_sessions
│   │   ├── UserTerm.java                    # @Entity → user_terms
│   │   ├── QuizResult.java                  # @Entity → quiz_results
│   │   ├── Deck.java                        # @Entity → decks
│   │   ├── DeckTerm.java                   # @Entity → deck_terms
│   │   └── GlobalTerm.java                 # @Entity → global_terms
│   └── exception/
│       ├── GlobalExceptionHandler.java      # @ControllerAdvice
│       ├── ResourceNotFoundException.java
│       └── InvalidTokenException.java
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   └── application-prod.yml
└── src/test/java/com/memorylang/stats/
    ├── service/
    │   ├── StreakServiceTest.java
    │   ├── MasteryServiceTest.java
    │   ├── DeckAnalyticsServiceTest.java
    │   ├── RecommendationServiceTest.java
    │   ├── QuizAnalyticsServiceTest.java
    │   └── SrsHealthServiceTest.java
    ├── controller/
    │   ├── StreakControllerTest.java
    │   ├── MasteryControllerTest.java
    │   ├── DeckControllerTest.java
    │   ├── RecommendationControllerTest.java
    │   ├── QuizControllerTest.java
    │   └── SrsControllerTest.java
    ├── integration/
    │   ├── StatsApiIntegrationTest.java      # Testcontainers + PostgreSQL
    │   └── CrossUserIsolationTest.java       # verifies no user can read another user's analytics
    └── resources/
        └── schema.sql                        # minimal schema snapshot for Testcontainers
```

### Schema snapshot checklist

Before creating entities, generate and review a schema snapshot from the current Supabase database:

```bash
npx supabase db dump --schema public --schema-only > schema-public.sql
```

Confirm these columns before implementation:

| Table | Required current shape |
|-------|------------------------|
| `user_terms` | Progress/SRS columns only plus `global_term_id`; dictionary fields and `translation` live on `global_terms` |
| `global_terms` | `source_text`, `normalized_text`, language fields, dictionary fields, `translation`, `note`, `tags`, `deleted_at` |
| `deck_terms` | Current app code inserts and reads `global_term_id`; verify whether remote DB still keeps `user_term_id` for compatibility |
| `decks` | Verify `visibility` and `parent_id`, because current frontend types use both |
| `quiz_results` | Aggregate quiz result rows are written by translation-input sessions |
| `quiz_answers` | Treat as legacy/optional in MVP because translation-input currently sends no per-question answers |

### Read-only database role

Create a dedicated runtime role for the Java API instead of using the Supabase `postgres` role. Keep it read-only and grant only the tables needed for analytics.

```sql
create role memorylang_stats_readonly
  login
  password '<generated-strong-password>'
  nosuperuser
  nocreatedb
  nocreaterole
  noinherit;

grant usage on schema public to memorylang_stats_readonly;

grant select on
  public.study_sessions,
  public.user_terms,
  public.global_terms,
  public.decks,
  public.deck_terms,
  public.quiz_results
to memorylang_stats_readonly;
```

Do not grant `insert`, `update`, `delete`, `execute` on RPCs, or `select` on unrelated admin/payment/subscription tables. If `quiz_answers` becomes part of the product later, add `select` only when the endpoint is implemented and tested.

---

## API Endpoints chi tiết

### 1. Streaks & Activity Heatmap

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/streaks` | Current streak, best streak, total active days |
| GET | `/api/v1/streaks/heatmap?year=2026` | GitHub-style activity grid (365 days, count per day) |

**Response — StreakDto:**
```json
{
  "currentStreak": 5,
  "bestStreak": 12,
  "totalActiveDays": 45,
  "lastActiveDate": "2026-07-08"
}
```

**Response — ActivityHeatmapDto:**
```json
{
  "year": 2026,
  "days": [
    { "date": "2026-01-01", "count": 0 },
    { "date": "2026-01-02", "count": 3 },
    ...
  ]
}
```

**SQL core (streak calculation):**
```sql
WITH active_days AS (
  SELECT DISTINCT DATE(started_at) AS study_date
  FROM study_sessions
  WHERE user_id = :userId AND started_at IS NOT NULL
),
streak_calc AS (
  SELECT study_date,
         study_date - (ROW_NUMBER() OVER (ORDER BY study_date))::int AS grp
  FROM active_days
)
SELECT MIN(study_date) AS start_date,
       MAX(study_date) AS end_date,
       (MAX(study_date) - MIN(study_date))::int + 1 AS streak_length
FROM streak_calc
GROUP BY grp
ORDER BY start_date DESC;
```

### 2. Learning Curve & Mastery

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/mastery/distribution` | Status distribution histogram (new/learning/familiar/memorized/difficult/need_review) |
| GET | `/api/v1/mastery/ease-factor` | Ease factor distribution (buckets: <1.5, 1.5-2.0, 2.0-2.5, 2.5+) |
| GET | `/api/v1/mastery/trajectory?weeks=12` | Weekly mastery progression: count of memorized terms per week |

**SQL core (ease factor distribution):**
```sql
SELECT
  COUNT(*) FILTER (WHERE srs_ease_factor < 1.5) AS bucket_1,
  COUNT(*) FILTER (WHERE srs_ease_factor >= 1.5 AND srs_ease_factor < 2.0) AS bucket_2,
  COUNT(*) FILTER (WHERE srs_ease_factor >= 2.0 AND srs_ease_factor < 2.5) AS bucket_3,
  COUNT(*) FILTER (WHERE srs_ease_factor >= 2.5) AS bucket_4
FROM user_terms
WHERE user_id = :userId AND deleted_at IS NULL;
```

### 3. Deck Completion & Engagement

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/decks/analytics` | All decks: completion %, term count, memorized count, difficult count |
| GET | `/api/v1/decks/{id}/engagement` | Per-deck: session count, avg cards/session, remembered ratio, avg duration |

**SQL core (deck completion — use verified `deck_terms.global_term_id` path if present):**
```sql
SELECT d.id, d.name,
  COUNT(ut.id) AS total_terms,
  COUNT(ut.id) FILTER (WHERE ut.status = 'memorized') AS memorized_count,
  COUNT(ut.id) FILTER (WHERE ut.status = 'difficult') AS difficult_count,
  ROUND(COUNT(ut.id) FILTER (WHERE ut.status = 'memorized')::numeric
    / NULLIF(COUNT(ut.id), 0) * 100, 1) AS completion_pct
FROM decks d
LEFT JOIN deck_terms dt ON dt.deck_id = d.id
LEFT JOIN user_terms ut
  ON ut.user_id = d.user_id
 AND ut.global_term_id = dt.global_term_id
 AND ut.deleted_at IS NULL
WHERE d.user_id = :userId
GROUP BY d.id, d.name;
```

If the schema snapshot shows `deck_terms.user_term_id` is still the production source of truth, use `ut.id = dt.user_term_id` instead. Do not ship both assumptions blindly.

### 4. Recommendation Engine

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/recommendations/review` | Terms due for review now (next_review_at <= now) |
| GET | `/api/v1/recommendations/at-risk` | Terms with high wrong_count, low repetition, status difficult/need_review |
| GET | `/api/v1/recommendations/almost-memorized` | Status familiar + srs_interval_days >= 7 → one more review to memorized |
| GET | `/api/v1/recommendations/neglected?days=14` | Terms not reviewed in X days (configurable, default 14) |
| GET | `/api/v1/recommendations/next-terms?limit=10` | Unstarted global terms sharing tags/POS with mastered terms (content-based) |
| GET | `/api/v1/recommendations/weak-deck` | Deck with lowest completion → recommend study |

**Recommendation algorithm (content-based filtering):**
```sql
-- Find tags/POS of user's mastered terms
WITH mastered_profile AS (
  SELECT gt.part_of_speech, unnest(gt.tags) AS tag
  FROM user_terms ut
  JOIN global_terms gt ON gt.id = ut.global_term_id
  WHERE ut.user_id = :userId
    AND ut.status = 'memorized'
    AND ut.deleted_at IS NULL
    AND gt.deleted_at IS NULL
),
-- Score unstarted terms by tag/POS overlap
candidate_terms AS (
  SELECT gt.id, gt.source_text, gt.part_of_speech, gt.tags,
    (SELECT COUNT(*) FROM mastered_profile mp
     WHERE mp.part_of_speech = gt.part_of_speech) AS pos_score,
    (SELECT COUNT(*) FROM mastered_profile mp
     WHERE mp.tag = ANY(gt.tags)) AS tag_score
  FROM global_terms gt
  WHERE gt.deleted_at IS NULL
    AND gt.source_language = :sourceLanguage
    AND gt.native_language = :nativeLanguage
    AND gt.id NOT IN (
      SELECT global_term_id FROM user_terms WHERE user_id = :userId AND deleted_at IS NULL
    )
)
SELECT id, source_text, part_of_speech,
  (COALESCE(pos_score, 0) + COALESCE(tag_score, 0)) AS relevance_score
FROM candidate_terms
ORDER BY relevance_score DESC, source_text
LIMIT :limit;
```

### 5. Quiz Analytics

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/quiz/analytics/summary` | Overall: total quizzes, avg accuracy, avg duration, per-type breakdown |
| GET | `/api/v1/quiz/analytics/recent?limit=30` | Recent aggregate quiz attempts from `quiz_results` |
| FUTURE | `/api/v1/quiz/analytics/term-performance?limit=20` | Add only after `quiz_answers` is populated by translation-input sessions |
| FUTURE | `/api/v1/quiz/analytics/most-failed?limit=10` | Add only after `quiz_answers` is populated by translation-input sessions |

**Current product constraint:** `QuizSessionPage.saveQuizResult()` writes aggregate `quiz_results` rows, but passes `answers: []`, so `quiz_answers` does not contain translation-input attempts. For MVP Java, implement only summary/recent endpoints and omit per-question endpoints from OpenAPI until the frontend starts writing answers.

**SQL core (aggregate summary):**
```sql
SELECT
  COUNT(*) AS total_quizzes,
  COALESCE(ROUND(
    SUM(correct_answers)::numeric / NULLIF(SUM(total_questions), 0) * 100,
    1
  ), 0) AS average_accuracy,
  COALESCE(ROUND(AVG(duration_ms)), 0) AS average_duration_ms,
  quiz_type
FROM quiz_results
WHERE user_id = :userId
GROUP BY quiz_type;
```

**Future SQL core (only after `quiz_answers` has data):**
```sql
SELECT qa.question, qa.user_answer, qa.correct_answer,
  COUNT(*) AS fail_count,
  AVG(qa.duration_ms) AS avg_duration_ms
FROM quiz_answers qa
JOIN quiz_results qr ON qr.id = qa.quiz_result_id
WHERE qr.user_id = :userId AND qa.is_correct = false
GROUP BY qa.question, qa.user_answer, qa.correct_answer
ORDER BY fail_count DESC
LIMIT :limit;
```

### 6. SRS Health & Forecast

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/srs/health` | Overdue backlog (by days overdue: 1d/3d/7d+), retrograde terms, ease factor avg |
| GET | `/api/v1/srs/forecast?days=14` | Upcoming reviews count per day for next N days |
| GET | `/api/v1/srs/difficulty-distribution` | Histogram of srs_interval_days (1d/7d/30d/90d+ buckets) |

**SQL core (SRS forecast):**
```sql
SELECT DATE(next_review_at) AS review_date,
  COUNT(*) AS review_count
FROM user_terms
WHERE user_id = :userId
  AND deleted_at IS NULL
  AND next_review_at BETWEEN now() AND now() + :days::int
GROUP BY DATE(next_review_at)
ORDER BY review_date;
```

---

## Authentication: Supabase JWT Verification

### Flow

```
Request → Authorization: Bearer <supabase_jwt>
    ↓
SupabaseJwtFilter
    ├── Decode JWT header and verify actual alg for this Supabase project
    ├── If RS256/ES256: fetch JWKS from https://<project>.supabase.co/auth/v1/.well-known/jwks.json
    ├── Cache JWKS (Caffeine or Guava Cache, TTL 1h)
    ├── Verify signature using cached public key
    ├── Validate: iss, exp, iat
    ├── Extract sub (user UUID) → AuthUser record
    └── Set SecurityContext
    ↓
Controller receives AuthUser via @AuthenticationPrincipal
```

### Config (`application.yml`)
```yaml
supabase:
  url: https://brwvbpkgimhamivmaflu.supabase.co
  jwt:
    issuer: https://brwvbpkgimhamivmaflu.supabase.co/auth/v1
    jwks-url: ${supabase.url}/auth/v1/.well-known/jwks.json
    expected-algorithm: ${SUPABASE_JWT_ALG:RS256}
```

### Key implementation details
- Do not assume the JWT algorithm from memory; verify with a real access token in setup and document the result in `README.md`
- JWKS caching avoids fetching public keys on every request
- Cache public keys with 1-hour TTL, auto-refresh on cache miss
- `AuthUser` is a Java `record` — immutable, thread-safe
- `SupabaseJwtFilter` extends `OncePerRequestFilter`
- Public endpoints (`/swagger-ui/**`, `/v3/api-docs/**`, `/actuator/health`) bypass JWT filter
- Protected endpoint tests must include: missing token → 401, invalid signature → 401, expired token → 401, valid token user A cannot query user B data → no leaked rows

---

## Configuration

### `application.yml`

```yaml
spring:
  application:
    name: memorylang-stats-api
  datasource:
    url: jdbc:postgresql://db.brwvbpkgimhamivmaflu.supabase.co:5432/postgres
    username: ${STATS_DB_USER}
    password: ${STATS_DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 20000
      idle-timeout: 300000
      max-lifetime: 1200000
  jpa:
    hibernate:
      ddl-auto: none
    properties:
      hibernate:
        default_schema: public
        jdbc.time_zone: UTC
    open-in-view: false
  threads:
    virtual:
      enabled: true

supabase:
  url: https://brwvbpkgimhamivmaflu.supabase.co
  jwt:
    issuer: ${supabase.url}/auth/v1
    jwks-url: ${supabase.url}/auth/v1/.well-known/jwks.json

server:
  port: 8080

springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
```

### `.env.example`
```
SUPABASE_URL=https://brwvbpkgimhamivmaflu.supabase.co
STATS_DB_USER=memorylang_stats_readonly
STATS_DB_PASSWORD=your-readonly-db-password
```

---

## Docker

### Dockerfile
```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw dependency:go-offline
COPY src ./src
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### docker-compose.yml
```yaml
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SUPABASE_URL=${SUPABASE_URL}
      - STATS_DB_USER=${STATS_DB_USER}
      - STATS_DB_PASSWORD=${STATS_DB_PASSWORD}
    restart: unless-stopped
```

---

## Google Cloud Run Demo Deployment

Use this only as a portfolio/demo deployment while the Google Cloud free trial is active. Local Docker remains the zero-cost baseline.

### Cost guardrails

- Create a Google Cloud budget alert before deploying.
- Use Cloud Run, not Compute Engine VM, GKE, or Cloud SQL.
- Set Cloud Run `min-instances=0` so idle cost is zero.
- Set `max-instances=1` for demo or `2` for light testing.
- Keep CPU allocated only during request.
- Store DB credentials in Secret Manager, not environment variables committed to Git.
- Delete or disable the Cloud Run service after demo/interview if not needed.

### `cloudbuild.yaml`

```yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - ${_REGION}-docker.pkg.dev/$PROJECT_ID/memorylang/stats-api:$SHORT_SHA
      - .
  - name: gcr.io/cloud-builders/docker
    args:
      - push
      - ${_REGION}-docker.pkg.dev/$PROJECT_ID/memorylang/stats-api:$SHORT_SHA
images:
  - ${_REGION}-docker.pkg.dev/$PROJECT_ID/memorylang/stats-api:$SHORT_SHA
substitutions:
  _REGION: asia-southeast1
```

### Cloud Run commands

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories create memorylang \
  --repository-format=docker \
  --location=asia-southeast1

gcloud builds submit --config cloudbuild.yaml --substitutions=_REGION=asia-southeast1

gcloud run deploy memorylang-stats-api \
  --image=asia-southeast1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/memorylang/stats-api:COMMIT_SHA \
  --region=asia-southeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars=SUPABASE_URL=https://brwvbpkgimhamivmaflu.supabase.co
```

For a real deploy, replace `COMMIT_SHA` with the image tag emitted by Cloud Build and mount `STATS_DB_USER`, `STATS_DB_PASSWORD`, and JWT settings from Secret Manager.

### Cloud Run verification

- Open `/actuator/health` and Swagger UI on the Cloud Run URL.
- Call one protected endpoint with a valid Supabase JWT.
- Confirm unauthenticated requests return 401.
- Confirm Cloud Run scales to zero after idle time.
- Confirm billing dashboard shows only small Cloud Run/Artifact Registry/egress usage under free-trial credits.

---

## Entity Mappings

| Entity | Table | Key columns mapped |
|--------|-------|--------------------|
| `StudySession` | `study_sessions` | id, userId, deckId, mode, totalCards, viewedCards, rememberedCount, difficultCount, startedAt, endedAt |
| `UserTerm` | `user_terms` | id, userId, globalTermId, status, viewCount, correctCount, wrongCount, audioPlayCount, srsRepetition, srsIntervalDays, srsEaseFactor, lastReviewedAt, nextReviewAt, flagged, deletedAt |
| `GlobalTerm` | `global_terms` | id, sourceText, normalizedText, sourceLanguage, nativeLanguage, itemType, partOfSpeech, ipa, audioUrl, imageUrl, meanings(jsonb), examples(jsonb), translation, note, tags(text[]), deletedAt |
| `QuizResult` | `quiz_results` | id, userId, deckId, quizType, totalQuestions, correctAnswers, wrongAnswers, durationMs, createdAt |
| `QuizAnswer` | `quiz_answers` | Future/optional only; do not depend on this table for MVP analytics |
| `Deck` | `decks` | id, userId, name, description, sourceLanguage, nativeLanguage, color, icon, visibility, parentId, createdAt, updatedAt |
| `DeckTerm` | `deck_terms` | deckId, globalTermId, createdAt; verify whether userTermId remains in remote schema |

### Entity conventions
- Use `@Table(name = "...")` with explicit snake_case mapping
- Use Java `record` for DTOs, `@Entity` classes for JPA entities
- `@Column(name = "snake_case")` for all columns
- `@Enumerated(EnumType.STRING)` for status/mode enum fields
- `@Type(JsonType.class)` for jsonb columns (using `hypersistence-utils`)
- Soft-delete filter: all queries add `deleted_at IS NULL` where the table has that column
- Keep entity fields aligned to the schema snapshot, not the initial migration file alone

---

## Testing Strategy

| Layer | Tool | What's tested | Coverage target |
|-------|------|---------------|-----------------|
| Unit (Service) | JUnit 5 + Mockito | Business logic, recommendation scoring, DTO mapping | 80%+ |
| Controller (Web layer) | MockMvc + `@WebMvcTest` | HTTP status, JSON shape, auth filter, error responses | All endpoints |
| Integration | Testcontainers + PostgreSQL | Real SQL queries against schema snapshot, cross-user isolation | Critical paths |
| Auth | MockMvc + mocked JWT | Token verification, expired token, invalid token | Filter logic |
| Security | Integration + seeded user A/B data | Every endpoint filters by authenticated user and never leaks another user | All protected endpoints |

### Test conventions
- Service tests: mock repositories, verify SQL query construction
- Controller tests: `@WebMvcTest` with mocked services, test all status codes (200, 401, 404, 500)
- Integration tests: `@SpringBootTest` + Testcontainers PostgreSQL, run actual SQL against a fresh DB with schema snapshot
- Cross-user test seed must create two users with overlapping decks/terms and assert the token for user A never returns user B rows
- Quiz per-question endpoint tests stay disabled/not present until frontend writes `quiz_answers`
- Test data: use `@Sql` scripts or Flyway test migrations to seed test data

---

## Implementation Phases

| Phase | Nội dung | Thời gian |
|-------|----------|-----------|
| 0 | Schema/auth verification: dump schema, verify JWT alg, create/read test read-only DB role, document findings in README | 0.5 ngày |
| 1 | Project setup: `pom.xml`, Dockerfile, `docker-compose.yml`, `application.yml`, project structure, base application class | 0.5 ngày |
| 2 | Auth: `SupabaseJwtFilter`, `SupabaseJwtVerifier`, JWKS caching if applicable, `SecurityConfig`, `AuthUser` record | 1 ngày |
| 3 | Entities + repositories: map verified current tables, add `AnalyticsJdbcRepository`, add schema snapshot for tests | 0.75 ngày |
| 4 | Streaks + Heatmap: SQL, service, controller, unit tests, controller tests | 1 ngày |
| 5 | Mastery + SRS health/forecast: SQL, service, controller, unit tests, controller tests | 1 ngày |
| 6 | Deck analytics: SQL using verified `deck_terms` join path, service, controller, tests | 0.75 ngày |
| 7 | Quiz aggregate analytics only: summary/recent from `quiz_results`, explicit deferral for `quiz_answers` endpoints | 0.5 ngày |
| 8 | Recommendation engine: review/at-risk/almost-memorized/neglected/weak-deck/next-terms with language filters | 1.5 ngày |
| 9 | GlobalExceptionHandler, OpenAPI docs, Swagger UI, error handling polish | 0.5 ngày |
| 10 | Integration/security tests (Testcontainers), Docker build + verify | 1 ngày |
| 11 | Optional Google Cloud Run demo deploy with budget guardrails, Secret Manager, and scale-to-zero verification | 0.5 ngày |

**Tổng: ~9 ngày local/portfolio, ~9.5 ngày nếu thêm Cloud Run demo**

---

## Dependencies (`pom.xml` key entries)

| Dependency | Purpose |
|------------|---------|
| `spring-boot-starter-web` | REST API |
| `spring-boot-starter-data-jpa` | JPA/Hibernate |
| `spring-boot-starter-security` | Security filter chain |
| `spring-boot-starter-validation` | Bean validation |
| `org.postgresql:postgresql` | PostgreSQL JDBC driver |
| `com.zaxxer:HikariCP` | Connection pooling (included transitively) |
| `io.hypersistence:hypersistence-utils-hibernate-63` | JSONB + array mapping |
| `com.github.ben-manes.caffeine:caffeine` | JWKS/public-key cache |
| `org.springdoc:springdoc-openapi-starter-webmvc-ui` | Swagger UI |
| `org.springframework.boot:spring-boot-starter-test` | Test framework |
| `org.testcontainers:postgresql` | Integration tests |
| `org.testcontainers:junit-jupiter` | Testcontainers JUnit5 |
| `org.mockito:mockito-core` | Mocking |

---

## Cost Strategy

- **Zero-cost baseline**: run locally with Docker Compose and Testcontainers; no public hosting required for CV.
- **Free-trial demo**: deploy to Google Cloud Run only when needed, with `min-instances=0` and `max-instances=1`.
- **Avoid fixed costs**: do not add Cloud SQL, VM, GKE, or always-on instances.
- **Supabase impact**: analytics responses are small; watch database egress, but initial demo traffic should stay inside existing free quotas.
- **Shutdown plan**: after demo/interview, either delete the Cloud Run service or set ingress/internal access to prevent unexpected traffic.

---

## Frontend Integration (optional, future)

After the Java API is built and verified, the MemoryLang React frontend can optionally consume it:

1. Add API base URL to `.env`: `VITE_STATS_API_URL=http://localhost:8080/api/v1`
2. Create `src/services/stats/statsApi.service.ts` — HTTP client with JWT injection
3. Create new dashboard widgets that call the Java API for advanced analytics
4. Add a "Smart Recommendations" panel to the dashboard

This step is optional for the CV — the Java API standalone already demonstrates the required skills.

---

## CV bullet points (sau khi hoàn thành)

- Designed and built a REST analytics microservice with Spring Boot 3 and Java 21 (virtual threads), providing 18+ endpoints for learning analytics and personalized recommendations
- Implemented content-based recommendation engine using SQL window functions, CTEs, and FILTER clauses to suggest vocabulary based on user mastery patterns
- Integrated stateless Supabase JWT authentication with project-specific algorithm verification and cached public-key lookup when asymmetric signing is enabled
- Deployed the containerized service to Google Cloud Run with scale-to-zero cost controls and Secret Manager configuration
- Built comprehensive SQL analytics for streaks, activity heatmaps, SRS health forecasting, deck engagement, and quiz performance — surfacing insights the frontend could not compute
- Packaged with Docker, tested with JUnit 5 + Mockito + Testcontainers, and documented with OpenAPI/Swagger
- Applied Java 21 features: virtual threads for non-blocking I/O, records for immutable DTOs, sealed classes for entity hierarchies, pattern matching for type-safe error handling
