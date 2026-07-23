# Java Statistics & Recommendation API — Implementation Plan

> **Dành cho agent triển khai:** Bắt buộc thực hiện tuần tự theo phase và cập nhật checkbox ngay sau mỗi lần xác minh. Khi bắt đầu triển khai, dùng `superpowers:subagent-driven-development` hoặc `superpowers:executing-plans`. Không đánh dấu hoàn thành chỉ dựa trên việc đã viết code.

**Mục tiêu:** Xây dựng microservice Java read-only cung cấp analytics học tập và gợi ý từ vựng cho MemoryLang, dùng Supabase PostgreSQL hiện tại làm nguồn dữ liệu và Supabase JWT làm danh tính người dùng.

**Kiến trúc:** React gửi Supabase access token tới Spring Boot API. Spring Security xác minh token ES256 qua JWKS; Java lấy `sub`, mở transaction read-only, đặt `request.jwt.claim.sub` bằng `set_config(..., true)`, rồi chạy SQL qua `JdbcClient`. PostgreSQL RLS và điều kiện `user_id` trong SQL cùng bảo vệ user isolation.

**Tech stack:** Java 21, Spring Boot 4.1.x, Spring MVC, Spring Security OAuth2 Resource Server, Spring JDBC `JdbcClient`, PostgreSQL 17, HikariCP, Flyway chỉ dùng cho schema test của Java repo, JUnit 5, MockMvc, Testcontainers, springdoc-openapi, Maven Wrapper, Docker.

---

## 1. Trạng thái kế hoạch

### Quy ước checklist

- `[x]`: đã thực hiện và có bằng chứng xác minh.
- `[ ]`: chưa thực hiện.
- `[!]`: đang bị chặn hoặc cần quyết định; ghi nguyên nhân ngay bên cạnh.
- Chỉ hoàn thành một phase khi toàn bộ mục bắt buộc của phase đó là `[x]`.
- Mỗi phase tạo một commit độc lập theo Conventional Commits; không tự động push.

### Tổng quan tiến độ

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 0 | Xác minh baseline remote | Đang thực hiện |
| 1 | Provision role JDBC và RLS | Đã xác minh local; chờ remote |
| 2 | Scaffold Java project | Hoàn thành |
| 3 | Supabase JWT authentication | Đã xác minh tự động; chờ test token thật |
| 4 | Transaction-scoped DB identity | Hoàn thành |
| 5 | Streak và activity heatmap | Hoàn thành |
| 6 | Mastery và SRS analytics | Hoàn thành |
| 7 | Deck analytics | Hoàn thành |
| 8 | Quiz aggregate analytics | Hoàn thành |
| 9 | Recommendation engine | Hoàn thành |
| 10 | API contract, error handling và observability | Hoàn thành |
| 11 | Security/integration tests và Docker | Hoàn thành |
| 12 | Cloud Run demo, tùy chọn | Chưa bắt đầu |
| 13 | Frontend integration, tùy chọn | Chưa bắt đầu |

---

## 2. Baseline đã xác minh ngày 2026-07-19

### Supabase project

| Thuộc tính | Giá trị đã xác minh |
|---|---|
| Project | `MemoryLang` |
| Project ref | `brwvbpkgimhamivmaflu` |
| Region | `ap-southeast-2` |
| Project status | `ACTIVE_HEALTHY` |
| PostgreSQL | `17.6.1.121` |
| Supabase CLI | `2.109.1`, chạy bằng `npx supabase` |
| JWT signing key | EC P-256, `alg=ES256` |
| JWKS | `https://brwvbpkgimhamivmaflu.supabase.co/auth/v1/.well-known/jwks.json` |

Nguồn xác minh: Supabase CLI `projects list`, Management API qua `db query`, và JWKS công khai. Không chốt `RS256`; verifier phải chỉ chấp nhận thuật toán phù hợp với key hiện hành và cho phép key rotation qua JWKS.

### Schema analytics hiện tại

| Bảng | Cột quan trọng đã xác minh |
|---|---|
| `user_terms` | `id`, `user_id`, `global_term_id`, `status`, counters, SRS fields, `flagged`, `deleted_at` |
| `global_terms` | dictionary fields, `translation`, `note`, `tags text[]`, `deleted_at` |
| `deck_terms` | `deck_id`, `global_term_id`, `created_at`; **không còn `user_term_id`** |
| `decks` | `user_id`, language fields, `visibility`, `parent_id` |
| `study_sessions` | aggregate card/session counters và timestamps |
| `quiz_results` | aggregate quiz counters, `duration_ms`, `created_at` |
| `quiz_answers` | còn tồn tại nhưng translation-input frontend hiện không ghi answers |

RLS đang bật trên cả bảy bảng trên; `FORCE ROW LEVEL SECURITY` hiện là `false`. `user_terms`, `study_sessions`, `quiz_results` và `quiz_answers` dùng ownership dựa trên `auth.uid()`. `decks` và `deck_terms` còn cho phép đọc deck public, vì vậy analytics role cần restrictive policy để không đưa dữ liệu user khác vào thống kê cá nhân.

Remote `auth.uid()` hiện đọc theo thứ tự:

```sql
coalesce(
  nullif(current_setting('request.jwt.claim.sub', true), ''),
  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
)::uuid
```

Java API sẽ đặt `request.jwt.claim.sub` trong transaction; không giả định cơ chế này nếu schema remote thay đổi mà chưa có test.

### Phase 0 evidence

- Baseline frontend suite: 61 files, 312 tests passed. Docker Desktop engine `29.5.2` đang chạy.
- Schema dump remote đã thành công tại `%TEMP%\memorylang-schema-public.sql`: 89,652 bytes, 2,632 lines, 30 public tables, đủ cả 7 bảng analytics và 56 policies.
- Direct database hostname trên máy này chỉ phân giải IPv6. Pooler của linked project là Supavisor session mode tại `aws-1-ap-southeast-2.pooler.supabase.com:5432`; không ghi credential. Direct IPv6 phù hợp cho local persistent access khi khả dụng; runtime IPv4 như Cloud Run dùng Supavisor session mode, không dùng transaction mode cho baseline.
- Remote advisors có 88 cảnh báo tổng cộng; 11 cảnh báo liên quan bảng analytics: 10 `auth_rls_initplan` và 1 `multiple_permissive_policies` trên `global_terms`. Phase 0 không sửa các cảnh báo advisor ngoài phạm vi này.
- Phase 0 chỉ chốt yêu cầu fixture two-user; file fixture Testcontainers sẽ được tạo ở Phase 11 sau khi Java repository tồn tại.

### Ràng buộc sản phẩm hiện tại

- Java API chỉ đọc; không cập nhật SRS, vocabulary, deck hoặc quiz.
- `deck_terms.global_term_id` là đường join chính thức.
- Translation-input quiz chỉ ghi `quiz_results`; không cung cấp per-question analytics trong MVP.
- Study completion ghi `study_sessions` và cập nhật SRS qua flow Supabase hiện tại; Java chỉ tổng hợp dữ liệu đã lưu.
- Frontend tiếp tục dùng Supabase service layer; Java API là companion service, không phải backend thay thế.
- Không dùng `service_role`, `postgres`, table owner hoặc role có `BYPASSRLS` ở runtime.
- Không ghi secret vào Git. MemoryLang `.env` dùng `SUPABASE_DB_PASSWORD`; Java runtime dùng `STATS_DB_PASSWORD` hoặc Secret Manager.

---

## 3. Phạm vi API MVP

### Endpoint bắt buộc

| Nhóm | Method và path | Kết quả |
|---|---|---|
| Activity | `GET /api/v1/streaks/current` | current/longest streak và ngày học gần nhất |
| Activity | `GET /api/v1/streaks/history?limit=12` | các streak gần nhất |
| Activity | `GET /api/v1/activity/heatmap?from=&to=` | số session/cards theo ngày |
| Activity | `GET /api/v1/activity/summary?days=30` | tổng session, cards, remembered ratio |
| Mastery | `GET /api/v1/mastery/distribution` | phân bố status thực tế |
| Mastery | `GET /api/v1/mastery/ease-factor` | histogram ease factor |
| SRS | `GET /api/v1/srs/health` | overdue buckets và ease trung bình |
| SRS | `GET /api/v1/srs/forecast?days=14` | số lượt ôn theo ngày |
| SRS | `GET /api/v1/srs/difficulty-distribution` | histogram interval |
| Deck | `GET /api/v1/decks/analytics` | tiến độ từng deck thuộc user |
| Deck | `GET /api/v1/decks/{id}/engagement` | engagement của deck thuộc user |
| Quiz | `GET /api/v1/quiz/analytics/summary` | aggregate accuracy/duration |
| Quiz | `GET /api/v1/quiz/analytics/recent?limit=30` | quiz gần đây |
| Recommendation | `GET /api/v1/recommendations/review` | từ đến hạn |
| Recommendation | `GET /api/v1/recommendations/at-risk` | từ có nguy cơ quên |
| Recommendation | `GET /api/v1/recommendations/almost-memorized` | từ gần đạt mastery |
| Recommendation | `GET /api/v1/recommendations/neglected?days=14` | từ lâu chưa ôn |
| Recommendation | `GET /api/v1/recommendations/weak-deck` | deck thuộc user có completion thấp nhất |
| Recommendation | `GET /api/v1/recommendations/next-terms?limit=10` | từ mới theo language/POS/tag profile |

### Ngoài MVP

- Không có endpoint ghi dữ liệu.
- Không có `/term-performance` hoặc `/most-failed` cho đến khi frontend ghi `quiz_answers` thật.
- Không dùng machine learning service; recommendation là deterministic SQL/content-based scoring.
- Không tạo sealed hierarchy chỉ để quảng bá Java feature. Dùng `record` cho DTO; chỉ dùng sealed types khi domain thật sự có closed variants.
- Không thêm Redis, Kafka, Cloud SQL, GKE hoặc service discovery.

### Quy ước API

- Tất cả endpoint nghiệp vụ yêu cầu `Authorization: Bearer <supabase-access-token>`.
- Swagger, OpenAPI và health endpoint là public; metrics chi tiết không public.
- `userId` không xuất hiện trong query/path/body. User luôn lấy từ JWT `sub`.
- Timestamps trả về ISO-8601 UTC; ngày heatmap trả về `YYYY-MM-DD` theo timezone được chốt là `Asia/Ho_Chi_Minh`.
- `limit`: mặc định theo endpoint, tối đa `100`; `days`: `1..365`; `from <= to`, khoảng heatmap tối đa `366` ngày.
- Empty dataset trả `200` với zero/empty collection, không trả `404`.
- Deck không thuộc user trả `404` để không tiết lộ sự tồn tại.

---

## 4. Kiến trúc và cấu trúc repository

Java project là sibling repo: `../memorylang-stats-api/`. MemoryLang chỉ chứa migration/policy liên quan database và tài liệu tích hợp.

```text
memorylang-stats-api/
├── pom.xml
├── mvnw
├── mvnw.cmd
├── .mvn/wrapper/
├── .env.example
├── Dockerfile
├── compose.yaml
├── README.md
├── src/main/java/com/memorylang/stats/
│   ├── MemoryLangStatsApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── DatabaseConfig.java
│   │   └── OpenApiConfig.java
│   ├── auth/
│   │   ├── AuthenticatedUser.java
│   │   └── AuthenticatedUserResolver.java
│   ├── database/
│   │   ├── UserScopedTransaction.java
│   │   └── AnalyticsJdbcRepository.java
│   ├── activity/
│   ├── mastery/
│   ├── deck/
│   ├── quiz/
│   ├── recommendation/
│   └── shared/
│       ├── ApiError.java
│       └── GlobalExceptionHandler.java
├── src/main/resources/application.yml
└── src/test/
    ├── java/com/memorylang/stats/
    └── resources/db/test-schema.sql
```

Mỗi feature package chứa controller, service và DTO của riêng feature. Không tạo JPA entities vì MVP chỉ chạy aggregate/native SQL; `JdbcClient` làm boundary rõ hơn và tránh mapping thừa.

### Runtime data flow

```text
Bearer JWT
  → Spring Security JwtDecoder (issuer + JWKS, ES256)
  → AuthenticatedUser(UUID từ sub)
  → UserScopedTransaction.execute(userId, callback)
  → SET LOCAL request.jwt.claim.sub bằng set_config(..., true)
  → JdbcClient query có user_id = :userId
  → PostgreSQL RLS kiểm tra auth.uid()
  → DTO record → JSON
```

`UserScopedTransaction` bắt buộc dùng cùng connection cho `set_config` và analytics query. Không dùng session-level `SET`; Hikari tái sử dụng connection và có thể làm rò identity giữa request.

---

## Phase 0 — Xác minh baseline remote

**Mục tiêu:** Chốt schema, JWT, connection mode và dữ liệu đủ dùng trước khi tạo Java project.

**Đầu ra:** Phần baseline trong tài liệu này và snapshot schema chỉ chứa cấu trúc phục vụ Testcontainers.

### Checklist Phase 0

- [x] Xác nhận CLI đăng nhập và linked project là `brwvbpkgimhamivmaflu`.
- [x] Xác nhận remote PostgreSQL là 17 và project healthy.
- [x] Xác nhận JWKS hiện dùng EC/ES256.
- [x] Xác nhận `deck_terms` dùng `global_term_id` và không còn `user_term_id`.
- [x] Xác nhận các bảng analytics đều bật RLS, `FORCE RLS=false`.
- [x] Đọc định nghĩa remote `auth.uid()` và xác nhận GUC `request.jwt.claim.sub`.
- [x] Xác nhận `quiz_answers` chưa phù hợp cho translation-input analytics từ hành vi frontend hiện tại.
- [x] Bật Docker Desktop và chạy `npx supabase db dump --linked --schema public --file "$env:TEMP\memorylang-schema-public.sql"` để lưu bằng chứng schema đầy đủ ngoài Git.
- [x] Kiểm tra Dashboard → Connect và chọn connection mode: direct IPv6 cho local nếu khả dụng; Supavisor session mode tại `aws-1-ap-southeast-2.pooler.supabase.com:5432` cho runtime IPv4; không dùng transaction mode cho baseline.
- [ ] Sau khi Phase 1 tạo dedicated stats role, ghi host, port và username runtime vào Java `.env` mà không ghi password vào Git; chưa thể hoàn tất khi role chuyên dụng chưa tồn tại.
- [x] Chốt yêu cầu fixture two-user cho kiểm thử local/Testcontainers, không sao chép dữ liệu người dùng thật; tạo file fixture ở Phase 11 sau khi Java repository tồn tại.
- [x] Chạy `npx supabase db advisors --linked`: 11 cảnh báo liên quan bảng analytics, gồm 10 `auth_rls_initplan` và 1 `multiple_permissive_policies` trên `global_terms`.
- [x] Commit tài liệu baseline bằng `docs: verify Supabase analytics baseline`.

**Điều kiện hoàn thành:** Schema snapshot, connection mode và advisors đều được xác minh; không còn giả định về tên cột, JWT algorithm hoặc RLS helper.

---

## Phase 1 — Provision JDBC role và RLS isolation

**Mục tiêu:** Tạo runtime role chỉ đọc và giữ user isolation ở cả SQL lẫn RLS.

**Files:**

- MemoryLang tạo migration timestamped bằng `npx supabase migration new add_stats_api_readonly_role`.
- Java repo tạo mẫu secret: `.env.example`
- Java repo tài liệu vận hành: `README.md`

**Thiết kế quyền:**

- `memorylang_stats_readonly`: login, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOBYPASSRLS`.
- Không có direct role membership hoặc `SET OPTION` tới bất kỳ role nào.
- Chỉ `USAGE` trên `public` và `SELECT` trên sáu bảng MVP.
- `default_transaction_read_only=on`.
- Không cấp quyền trên `subscriptions`, `payment_logs`, admin tables hoặc RPC ghi dữ liệu.
- Không có effective `EXECUTE` trên bất kỳ routine hiện hữu nào trong `public`; ACL hiện hữu của `anon`, `authenticated`, `service_role` được giữ nguyên bằng explicit grants.
- Migration này chỉ harden snapshot routine hiện tại, không thay đổi default privileges toàn platform. Mỗi migration tạo public routine sau này phải explicit revoke `PUBLIC`, grant đúng Supabase role cần dùng và chạy lại stats privilege audit.
- Thêm restrictive `SELECT` policy cho `decks` và `deck_terms` để loại deck public của user khác khỏi analytics cá nhân.
- Password được tạo/rotate ngoài migration từ secret; migration không chứa literal password.

### Checklist Phase 1

- [x] Chạy GitNexus impact cho các policy/migration liên quan trước khi sửa.
- [x] Tạo migration bằng `npx supabase migration new add_stats_api_readonly_role`.
- [x] Định nghĩa/grant role không chứa password trong migration.
- [x] Thêm policy ownership cho `user_terms`, `study_sessions`, `quiz_results` và nested ownership cho `deck_terms`.
- [x] Thêm restrictive policy cho `decks`/`deck_terms` để policy public không mở rộng analytics scope.
- [x] Cho phép đọc `global_terms` đã active chỉ trong phạm vi cần cho join/recommendation.
- [x] Chạy migration trên local Supabase.
- [x] Test không có GUC: query bảng user-owned trả 0 hàng.
- [x] Test GUC user A: query không có `WHERE user_id` vẫn chỉ trả user A.
- [x] Test user A không thể đọc row/deck của user B.
- [x] Test exact SELECT allowlist và zero write privilege trên ordinary/partitioned tables, views, materialized views và foreign tables trong `public`; test riêng zero sequence privilege.
- [x] Test role không có direct membership/`SET OPTION` tới bất kỳ role nào; replay có custom parent role phải dọn về zero.
- [x] Xác nhận catalog không cấp `SET OPTION` tới `postgres`; behavioral local session-authorization check trả `permission denied` khi thử `SET ROLE postgres`.
- [x] Test role không có effective `EXECUTE` trên current public routines, Supabase RPC ACL hiện hữu không đổi và replay xử lý được procedure bằng `ON ROUTINE`.
- [x] Chạy `npx supabase db advisors --local` và xác nhận không có cảnh báo mới từ các policy stats.
- [ ] Review SQL, chạy `npx supabase db push --dry-run`, sau đó chỉ push remote khi được xác nhận.
- [ ] Xác minh lại trên remote bằng transaction read-only và rollback.
- [x] Commit `feat: add read-only statistics database role` chỉ gồm migration, test và tài liệu xác minh liên quan.

**Điều kiện hoàn thành:** Credential runtime chỉ đọc; thiếu user context không thấy dữ liệu; user A không thể đọc user B ngay cả khi repository query quên tenant filter.

---

## Phase 2 — Scaffold Java project

**Mục tiêu:** Có ứng dụng Spring Boot khởi động được, cấu hình an toàn và build tái lập.

**Dependencies chính:** `spring-boot-starter-webmvc`, `spring-boot-starter-security`, `spring-boot-starter-security-oauth2-resource-server`, `spring-boot-starter-jdbc`, `spring-boot-starter-validation`, PostgreSQL JDBC, Actuator, springdoc-openapi, test starter, Testcontainers PostgreSQL.

### Checklist Phase 2

- [x] Tạo sibling repo `memorylang-stats-api` và Maven Wrapper 3.3.4 (Maven 3.9.15).
- [x] Chốt Spring Boot 4.1.0 và springdoc-openapi 3.0.3; tài liệu chính thức xác nhận springdoc 3.x hỗ trợ Boot 4 nói chung, còn cặp version chính xác được xác minh bằng local integration test/build và ghi rõ trong `pom.xml`/README.
- [x] Cấu hình Java 21 và `spring.threads.virtual.enabled=true`.
- [x] Tạo `application.yml` chỉ tham chiếu env vars, không chứa credential.
- [x] Tạo `.env.example` gồm `SUPABASE_URL`, `STATS_DB_URL`, `STATS_DB_USER`, `STATS_DB_PASSWORD`.
- [x] Cấu hình Hikari tối đa 5 connection cho baseline Supabase nhỏ; `minimum-idle=0` trên Cloud Run.
- [x] Bật SSL JDBC; không log URL có credential.
- [x] Tạo `/actuator/health` và smoke test context load với Testcontainers PostgreSQL 17; bật springdoc chỉ trong test để xác minh `/v3/api-docs` trả OpenAPI JSON thực trên Boot 4.1.0.
- [x] Chạy `./mvnw test` và xác nhận exit code 0.
- [x] Chạy `./mvnw package` và xác nhận JAR được tạo.
- [x] Scan repository để bảo đảm không có password/token thật.
- [x] Commit `chore: scaffold statistics API`.

**Điều kiện hoàn thành:** Clone sạch có thể chạy test/package chỉ bằng Maven Wrapper; ứng dụng khởi động khi có env hợp lệ.

---

## Phase 3 — Supabase JWT authentication

**Mục tiêu:** Chỉ token Supabase hợp lệ mới truy cập endpoint nghiệp vụ.

**Cấu hình:** Dùng Spring Security OAuth2 Resource Server thay vì custom JWT filter/cache. Cấu hình `issuer-uri=https://brwvbpkgimhamivmaflu.supabase.co/auth/v1` và JWKS URL chính thức; decoder phải hỗ trợ ES256 và key rotation.

### Checklist Phase 3

- [x] Viết MockMvc test: thiếu token trả 401.
- [x] Viết test: malformed token trả 401.
- [x] Viết test: token hết hạn trả 401.
- [x] Viết test: issuer sai trả 401.
- [x] Viết test: signature/kid sai trả 401.
- [x] Viết test: ES256 token hợp lệ tạo principal với UUID từ `sub`.
- [x] Implement `SecurityConfig`, stateless session và public allowlist tối thiểu.
- [x] Implement `AuthenticatedUserResolver`; từ chối `sub` thiếu hoặc không phải UUID.
- [x] Không dùng `user_metadata` cho authorization.
- [x] Không ghi JWT hoặc claims nhạy cảm vào log.
- [x] Chạy toàn bộ auth/controller tests.
- [ ] Test thủ công một token Supabase thật mà không lưu token vào file/log.
- [x] Commit `feat: authenticate Supabase JWTs` (`abd6d51`).

Bằng chứng tự động Phase 3 dùng JWKS server cục bộ và khóa EC P-256 sinh tạm thời trong bộ nhớ để chạy 13 test auth qua decoder/Nimbus/security chain thật, không gọi Supabase từ xa. Bộ test còn chứng minh RS256 bị từ chối dù public key tương ứng có trong JWKS, `user_metadata` không thể thay đổi danh tính từ `sub`, và authentication không được lưu trong HTTP session. Toàn bộ Java suite chạy 15 test thành công; executable JAR được package lại sau thay đổi.

**Điều kiện hoàn thành:** Bộ test bao phủ 401 và valid ES256; endpoint nghiệp vụ không thể truy cập ẩn danh.

---

## Phase 4 — Transaction-scoped database identity

**Mục tiêu:** Mỗi query chạy trong transaction read-only có `auth.uid()` đúng và không rò qua Hikari connection reuse.

**Interface:**

```java
public interface UserScopedTransaction {
    <T> T execute(UUID userId, Supplier<T> operation);
}
```

Implementation gọi parameterized SQL trước callback:

```sql
select set_config('request.jwt.claim.sub', :user_id, true)
```

### Checklist Phase 4

- [x] Viết integration test `auth.uid()` là null ngoài transaction context.
- [x] Viết integration test context user A chỉ thấy row A với query cố tình thiếu `WHERE user_id`.
- [x] Viết integration test A → commit → tái sử dụng connection → B chỉ thấy B.
- [x] Viết integration test rollback cũng xóa context.
- [x] Implement `UserScopedTransaction` bằng `TransactionTemplate` read-only.
- [x] Bảo đảm `set_config` và callback dùng cùng connection.
- [x] Repository SQL vẫn nhận `userId` và thêm ownership predicate; RLS là lớp thứ hai.
- [x] Không cho phép nested transaction đổi từ user A sang user B.
- [x] Chạy concurrency test với nhiều request A/B xen kẽ.
- [x] Chạy full test suite.
- [x] Commit `feat: scope database transactions to authenticated users`.

Bằng chứng tự động Phase 4 dùng fixture versioned trên PostgreSQL 17 Testcontainers và datasource Hikari một connection đăng nhập bằng role test read-only `NOINHERIT`, `NOSUPERUSER`, `NOBYPASSRLS`. Mười bốn test tích hợp xác nhận transaction-local `auth.uid()`, RLS khi query cố tình thiếu ownership predicate, explicit repository predicate, cùng backend PID qua commit/rollback reuse, direct nested same-user chỉ khi exact transaction-bound `ConnectionHolder` còn khớp, từ chối A → B trước khi đổi identity, từ chối same-user khi outer transaction bị suspend, và từ chối `afterCommit`/`afterCompletion` trước khi operation chạy. Bộ test cũng chứng minh 24 request virtual-thread đồng thời không rò dữ liệu, Spring đánh dấu transaction read-only độc lập với default của role, và PostgreSQL từ chối `INSERT`. Toàn bộ Java suite chạy 29 test thành công; executable JAR không chứa fixture hay Testcontainers. Java commits là `66051cd` và lifecycle hardening `7c9a0e5`.

**Điều kiện hoàn thành:** Không có identity leakage; cả tenant predicate và RLS cùng được chứng minh bằng Testcontainers.

---

## Phase 5 — Streak và activity heatmap

**Mục tiêu:** Cung cấp bốn endpoint activity từ `study_sessions.ended_at` và counters đã lưu.

### Checklist Phase 5

- [x] Viết SQL integration tests cho ngày liên tiếp, ngày trống, duplicate sessions cùng ngày và timezone boundary.
- [x] Implement current/longest streak bằng CTE/window functions.
- [x] Implement streak history có `limit 1..100`.
- [x] Implement heatmap với `from/to`, tối đa 366 ngày.
- [x] Implement summary với `days 1..365` và remembered ratio chia cho 0 an toàn.
- [x] Viết DTO records, service và controllers trong package `activity`.
- [x] Viết MockMvc tests cho JSON contract và invalid parameters.
- [x] Xác minh mọi query nằm trong `UserScopedTransaction`.
- [x] Chạy feature tests và full suite.
- [x] Commit `feat: add study activity analytics`.

Bằng chứng tự động Phase 5 dùng 15 test PostgreSQL 17 Testcontainers với clock cố định và security chain ES256/JWKS thật tại local. Bộ test xác minh CTE/window streak theo ngày distinct, stale streak, duplicate session, ranh giới nửa đêm `Asia/Ho_Chi_Minh`, empty state, zero-filled heatmap, tổng counter/ratio, giới hạn input, tenant predicate và RLS độc lập. Toàn bộ Java suite và package chạy 44 test thành công; executable JAR không chứa fixture, test class hoặc thư viện Testcontainers. Java commit là `1c7142e`.

**Điều kiện hoàn thành:** Bốn endpoint đúng timezone, empty-state và không nhìn thấy session của user khác.

---

## Phase 6 — Mastery và SRS analytics

**Mục tiêu:** Phản ánh trạng thái/SRS thực tế trong `user_terms`, không suy diễn lịch sử không tồn tại.

**Lưu ý:** Không triển khai mastery trajectory theo tuần trong MVP vì schema không lưu lịch sử chuyển status; current rows không thể tái tạo lịch sử đáng tin cậy.

### Checklist Phase 6

- [x] Viết test distribution dùng các status thực tế và vẫn trả bucket 0 cho status hợp lệ không có row.
- [x] Implement ease buckets `<1.5`, `1.5..<2.0`, `2.0..<2.5`, `>=2.5`.
- [x] Implement overdue buckets: `1d`, `2-3d`, `4-7d`, `8d+` không chồng lấn.
- [x] Định nghĩa retrograde term bằng tiêu chí có thể kiểm thử: `status in ('difficult','need_review')` hoặc `wrong_count > correct_count`.
- [x] Implement forecast `1..90` ngày theo `next_review_at`.
- [x] Implement interval buckets `1d`, `2-7d`, `8-30d`, `31-90d`, `91d+`.
- [x] Mọi query loại `deleted_at is not null`.
- [x] Viết controller validation và cross-user tests.
- [x] Chạy feature tests và full suite.
- [x] Commit `feat: add mastery and SRS analytics`.

Bằng chứng tự động Phase 6 dùng 13 test PostgreSQL 17 Testcontainers với clock cố định và security chain ES256/JWKS thật tại local. Bộ test xác minh status/ease/overdue/interval boundaries, retrograde OR không double-count, forecast theo nửa đêm `Asia/Ho_Chi_Minh`, zero-filled/empty responses, validation, explicit tenant predicate và RLS độc lập; đồng thời xác nhận không có mastery trajectory. Toàn bộ Java suite và package chạy 59 test thành công; executable JAR không chứa fixture, test class hoặc Testcontainers. Java commit là `921d85d`.

**Điều kiện hoàn thành:** Sáu phép tổng hợp trả số liệu không chồng bucket, không tính soft-deleted row và không hứa dữ liệu lịch sử không tồn tại.

---

## Phase 7 — Deck analytics

**Mục tiêu:** Tính tiến độ và engagement chỉ cho deck thuộc authenticated user.

**Join đã chốt:** `decks.id → deck_terms.deck_id → deck_terms.global_term_id → user_terms.global_term_id`, đồng thời `user_terms.user_id = decks.user_id`.

### Checklist Phase 7

- [x] Viết tests cho deck rỗng, deck có duplicate-safe term count và deck public của user khác.
- [x] Implement completion: total, memorized, difficult/need_review và percentage.
- [x] Implement engagement từ `study_sessions`: session count, average cards, remembered ratio; duration chỉ tính khi cả `started_at` và `ended_at` có giá trị hợp lệ.
- [x] Query deck detail luôn yêu cầu `d.user_id=:userId`, không dựa vào public deck policy.
- [x] Deck không thuộc user trả 404.
- [x] Viết controller/service/DTO tests.
- [x] Chạy EXPLAIN trên fixture đủ lớn và thêm index chỉ khi kế hoạch thực thi chứng minh cần thiết.
- [x] Chạy feature tests và full suite.
- [x] Commit `feat: add deck analytics`.

Bằng chứng tự động Phase 7 dùng 12 test PostgreSQL 17 Testcontainers qua security chain ES256/JWKS thật tại local. Bộ test xác minh deck rỗng, distinct `global_term_id`, trạng thái trùng lặp an toàn, soft-delete, thứ tự ổn định, engagement chỉ từ session hoàn thành, duration hợp lệ, explicit owner predicate, public/private deck của user khác và RLS độc lập. Toàn bộ Java suite và package chạy 71 test thành công; executable JAR chỉ chứa production deck classes. Trên fixture hiệu năng 10.000 deck, 100.000 deck-term và 200.000 user-term, truy vấn danh sách dùng các index hiện có và hoàn tất trong 15,510 ms. Trên 500.000 study session, partial index `study_sessions_user_deck_completed_idx` giảm engagement query từ Parallel Seq Scan 18,307 ms/6.667 buffers xuống Bitmap Index Scan 5,774 ms/4.873 buffers, nên index được lưu bằng migration `20260722152210_add_stats_deck_engagement_index.sql`. Supabase local replay và 34 pgTAP test đều thành công. Java commit là `8a1a585`.

**Điều kiện hoàn thành:** Không dùng `user_term_id`; public deck không làm nhiễu analytics cá nhân.

---

## Phase 8 — Quiz aggregate analytics

**Mục tiêu:** Chỉ cung cấp analytics có dữ liệu đáng tin từ `quiz_results`.

### Checklist Phase 8

- [x] Viết tests cho zero quiz, nhiều quiz type, tổng questions bằng 0 và limit boundary.
- [x] Implement summary: total quizzes, weighted accuracy, average duration và breakdown theo `quiz_type`.
- [x] Implement recent results với `limit 1..100`, mặc định 30, sort `created_at desc`.
- [x] Không tạo DTO/controller/OpenAPI path cho per-question analytics.
- [x] Không query `quiz_answers` trong MVP.
- [x] Viết cross-user isolation tests.
- [x] Chạy feature tests và full suite.
- [x] Commit `feat: add aggregate quiz analytics`.

Bằng chứng tự động Phase 8 dùng 10 test PostgreSQL 17 Testcontainers qua security chain ES256/JWKS thật tại local. Bộ test xác minh zero quiz, weighted accuracy trên nhiều `quiz_type`, tổng questions bằng 0, duration null/âm/0, default limit 30, boundary `1..100`, thứ tự recent, aggregate-only JSON contract, explicit tenant predicate và RLS cross-user isolation. Toàn bộ Java suite/package chạy 81 test thành công; executable JAR chứa production quiz classes nhưng không chứa fixture, test class, JUnit hoặc Testcontainers. Không có production query, DTO hay controller nào tham chiếu `quiz_answers`. Java commit là `92ab2bd`.

**Điều kiện hoàn thành:** API không trình bày dữ liệu per-question giả hoặc legacy như dữ liệu translation-input hiện hành.

---

## Phase 9 — Recommendation engine

**Mục tiêu:** Trả gợi ý deterministic, giải thích được và giới hạn theo ngôn ngữ học hiện tại.

**Scoring `next-terms`:** candidate phải active, chưa có trong `user_terms` của user, khớp `source_language/native_language`; điểm gồm POS overlap và tag overlap với mastered profile. Tie-break theo score giảm dần rồi `source_text`, `id` để ổn định.

### Checklist Phase 9

- [x] Viết tests cho due review, at-risk, almost-memorized và neglected boundary.
- [x] Chốt công thức at-risk bằng weighted score từ status, wrong/correct counts, ease factor và overdue days; ghi công thức trong README.
- [x] Implement review recommendations theo `next_review_at <= now()`.
- [x] Implement almost-memorized theo status/interval đã chốt trong test.
- [x] Implement neglected với `days 1..365`.
- [x] Implement weak-deck chỉ trên deck thuộc user và deck không rỗng.
- [x] Implement next-terms với language filters và `limit 1..50`.
- [x] Candidate score 0 không được ưu tiên trước candidate có overlap; empty profile có fallback deterministic được ghi rõ.
- [x] Viết tests chống duplicate từ tags và dùng `NOT EXISTS` để tránh null trap.
- [x] Chạy `EXPLAIN ANALYZE` trong transaction rollback trên fixture local gồm 10.000 global terms, 5.000 user terms, 100 decks và 10.000 memberships; execution time 42,650 ms, dùng index hiện có và không cần thêm index.
- [x] Viết controller/service/DTO và OpenAPI descriptions.
- [x] Chạy 12 feature tests (gồm duplicate `global_term_id`) và full suite tích hợp 105 tests, tất cả đều đạt.
- [x] Commit `2dd93ca feat: add vocabulary recommendations`.

**Review độc lập:** Finding duplicate recommendation/language-pair đã được đóng bằng `454214e fix: deduplicate recommendation terms`; query chọn một row deterministic cho mỗi `global_term_id` và profile đếm distinct term.

**Điều kiện hoàn thành:** Recommendation ổn định, giải thích được, không cross-language và không đề xuất từ user đã có.

---

## Phase 10 — API contract, error handling và observability

**Mục tiêu:** API có contract nhất quán, lỗi an toàn và đủ quan sát khi demo.

### Checklist Phase 10

- [x] Implement `ApiError` record gồm timestamp, status, code, message, path và requestId.
- [x] Implement handler cho validation 400, auth 401, forbidden 403, not found 404 và unexpected 500.
- [x] Response 500 không chứa SQL, schema, stack trace hoặc credential.
- [x] Cấu hình request correlation ID; log method/path/status/duration, không log JWT.
- [x] Hoàn thiện OpenAPI security scheme Bearer JWT, error schemas và examples.
- [x] Swagger/OpenAPI public; endpoint nghiệp vụ protected.
- [x] Cấu hình CORS allowlist bằng `STATS_CORS_ALLOWED_ORIGINS`; từ chối cấu hình rỗng hoặc wildcard khi credentials được bật.
- [x] Health endpoint không tiết lộ host/user database.
- [x] Viết 12 contract tests cho error shape, OpenAPI paths, CORS, logging, health exposure và HTTP 405; tất cả đều đạt.
- [x] Chạy full suite 105 tests và đóng gói JAR thành công.
- [x] Commit `fb05b19 feat: finalize API contract and observability`.

**Review độc lập:** Finding method không hỗ trợ bị đổi thành 500 đã được đóng bằng `7e4b8f9 fix: preserve method not allowed contract`; API trả `405 METHOD_NOT_ALLOWED`, OpenAPI khai báo response tương ứng, và `fed0207 fix: preserve allowed methods in 405 responses` giữ header HTTP `Allow`.

**Điều kiện hoàn thành:** Mọi endpoint có schema OpenAPI, lỗi nhất quán và log không làm rò secret/token.

---

## Phase 11 — Integration/security tests và Docker

**Mục tiêu:** Chứng minh API build/run độc lập và user isolation chịu được lỗi query/pooling.

### Checklist Phase 11

- [x] Testcontainers dùng PostgreSQL 17 và fixture có schema/policies tối thiểu tương đương remote cho sáu relation được phép đọc.
- [x] Seed user A/B có overlapping deck/term/session/quiz data.
- [x] Chạy cross-user tests cho toàn bộ 19 protected endpoints; negative-control mutation `auth.uid()=user B` làm hai test coverage mới RED đúng mục tiêu trước khi fixture được khôi phục và chuyển GREEN.
- [x] Chạy test role chỉ đọc và transaction context leakage qua commit/rollback, Hikari connection reuse, nested scope, exception và concurrent virtual threads.
- [x] Clone repository vào thư mục tạm độc lập và chạy `mvnw clean verify`: 107 tests, 0 failure/error/skip, JAR đóng gói thành công.
- [x] Tạo multi-stage Dockerfile: validate executable JAR rồi copy duy nhất artifact sang Eclipse Temurin JRE 21; runtime UID/GID 10001.
- [x] Không dùng `-DskipTests` hoặc `-Dmaven.test.skip=true`; host verification bắt buộc hoàn tất trước image build.
- [x] Tạo `compose.yaml` dùng env substitutions, read-only root filesystem, tmpfs `/tmp`, `cap_drop: ALL`, `no-new-privileges` và init.
- [x] Build image `memorylang-stats-api:phase11` thành công và chạy container local trên Docker Engine 29.5.2.
- [x] Smoke test local với PostgreSQL 17 fixture và JWKS ES256 tạm: health 200, Swagger 200, unauthenticated 401 và request hợp lệ user A 200.
- [x] Scan tracked files, build context, image metadata/history, runtime filesystem và packaged JAR; không có `.env`, token/password smoke, test fixture, Testcontainers hoặc JUnit trong artifact.
- [x] Ghi quy trình `clean verify`, build, Compose, smoke và shutdown trong README.
- [x] Commit `ceb2418 test: verify statistics API user isolation` và `9dfafd7 chore: containerize statistics API`.

**Review độc lập:** Đã đối chiếu đủ 19 endpoint theo 5 controller và không phát hiện finding Critical/Important trong coverage, isolation, artifact validation, non-root runtime, `.dockerignore`, Compose hardening hoặc tài liệu.

**Điều kiện hoàn thành:** `./mvnw verify`, Docker build và smoke tests đều exit 0; mọi endpoint vượt qua cross-user isolation.

---

## Phase 12 — Cloud Run demo (tùy chọn)

**Trạng thái:** Tạm hoãn theo quyết định ngày 2026-07-23; chỉ triển khai sau khi Java API và frontend integration hoạt động ổn định ở local.

**Mục tiêu:** Có URL demo chi phí thấp mà không làm yếu bảo mật database.

**Connection:** Cloud Run thường cần IPv4; ưu tiên Supavisor session mode cho backend persistent JDBC/Hikari. Chỉ dùng transaction mode nếu driver tắt prepared statements và test transaction-scoped GUC thành công end-to-end.

### Checklist Phase 12

- [ ] Tạo budget alert trước deployment.
- [ ] Tạo Artifact Registry tại `asia-southeast1` hoặc region được chọn gần Supabase `ap-southeast-2` sau khi đo latency/cost.
- [ ] Lưu `STATS_DB_PASSWORD` trong Secret Manager; không dùng plain deploy flag.
- [ ] Cấu hình `min-instances=0`, `max-instances=1`, CPU chỉ khi request và memory ban đầu 512 MiB.
- [ ] Cấu hình network restrictions nếu có static egress phù hợp; nếu không, ghi nhận giới hạn này trong threat model.
- [ ] Deploy container và xác minh health/Swagger.
- [ ] Gọi endpoint protected bằng token thật; xác nhận unauthenticated là 401.
- [ ] Chạy cross-user smoke test trên deployed service.
- [ ] Xác minh connection pool không vượt giới hạn Supabase.
- [ ] Xác minh scale-to-zero và billing dashboard.
- [ ] Ghi shutdown/delete procedure trong README.
- [ ] Commit `docs: document Cloud Run deployment`.

**Điều kiện hoàn thành:** Demo hoạt động, secrets nằm trong Secret Manager, cost guardrails được bật và có quy trình tắt service.

---

## Phase 13 — Frontend integration (tùy chọn)

**Mục tiêu:** MemoryLang React gọi Java API mà không thay thế Supabase service layer hiện tại.

**Files dự kiến trong MemoryLang:**

- `src/services/stats/statsApi.service.ts`
- `src/services/stats/statsApi.types.ts`
- Các dashboard widgets được duyệt riêng
- `.env.example` thêm `VITE_STATS_API_URL`

### Checklist Phase 13

- [x] Thực hiện GitNexus impact trước khi sửa service/dashboard symbols; index không nhận diện `DashboardPage` nên kết quả là `UNKNOWN`, phạm vi sửa được giới hạn ở một query/widget độc lập.
- [x] Thêm `VITE_STATS_API_URL` và không hardcode production URL; bỏ trống env sẽ giữ nguyên dashboard Supabase-only.
- [x] HTTP client lấy access token hiện tại từ Supabase session, gửi Bearer token và không log/đưa token vào URL.
- [x] Xử lý 401 bằng `supabase.auth.refreshSession()` đúng một lần; không tự lưu JWT bản sao.
- [x] Thêm React Query key `['stats-api', 'dashboard-insights', userId]` theo convention dự án.
- [x] Thiết kế loading/error/empty/success states riêng theo Neobrutalist components hiện có; backend error detail không được render.
- [x] Viết 5 unit/component tests cho widget và API adapter, gồm token header, refresh 401, thiếu session và các UI state.
- [x] Chạy `pnpm test` (63 files/317 tests), `pnpm tsc -b` và `pnpm build`, tất cả exit 0.
- [x] Chạy ESLint riêng toàn bộ file Phase 13, exit 0.
- [ ] `pnpm lint` toàn repository chưa exit 0 do 279 lỗi baseline ngoài phạm vi Phase 13; đã ghi nhận, không phát sinh từ các file Phase 13.
- [x] Chạy GitNexus detect changes trước commit; MCP không ánh xạ diff trong worktree và trả `No changes detected`, nên đã đối chiếu thêm bằng `git diff --check` và staged diff.
- [x] Commit integration unit Phase 13: `455e6e5 feat: integrate Java statistics dashboard insights`.

**Phạm vi đã chọn:** widget “Phân tích học tập” dùng `GET /api/v1/streaks/current` và `GET /api/v1/activity/summary?days=30` để hiển thị chuỗi hiện tại, chuỗi dài nhất, số phiên học và tỷ lệ ghi nhớ trong 30 ngày. Widget chỉ enable cho user Supabase đã đăng nhập và khi `VITE_STATS_API_URL` tồn tại.

**Trạng thái:** Phần triển khai Phase 13 đã hoàn thành và hoạt động ở mức build/test local. Checklist `pnpm lint` toàn repository còn mở vì lỗi baseline ngoài phạm vi; các file Phase 13 đã lint thành công.

**Điều kiện hoàn thành:** Frontend dùng API contract ổn định, không làm hỏng dashboard hiện tại và có fallback lỗi rõ ràng.

---

## 5. SQL rules bắt buộc

- Mọi query user-owned có cả `user_id=:userId` và chạy trong user-scoped transaction.
- Mọi query `user_terms`/`global_terms` loại soft-deleted row.
- Dùng `COUNT(*)`, `FILTER`, CTE/window functions ở database; không tải danh sách rồi `.size()` trong Java.
- Pagination/limit được bind parameter và có upper bound.
- Không nối chuỗi input vào SQL.
- Dùng `NULLIF` cho phép chia; định nghĩa rõ cách làm tròn.
- Dùng `NOT EXISTS` cho candidate exclusion.
- Timezone conversion phải explicit và có boundary tests.
- Thêm index chỉ dựa trên `EXPLAIN (ANALYZE, BUFFERS)` của fixture phù hợp; index là migration MemoryLang riêng.

---

## 6. Security acceptance matrix

| Tình huống | Kết quả bắt buộc |
|---|---|
| Không có token | 401 |
| Token hết hạn/sai issuer/sai signature | 401 |
| `sub` thiếu hoặc không phải UUID | 401 |
| User A yêu cầu deck của B | 404 |
| Repository query thiếu `WHERE user_id` trong security test | RLS vẫn chỉ trả A |
| Không đặt transaction GUC | 0 user-owned rows |
| Hikari reuse connection A rồi B | B không thấy dữ liệu A |
| Runtime role thử ghi dữ liệu | Permission denied/read-only error |
| Runtime role đọc bảng ngoài allowlist | Permission denied |
| Exception SQL | 500 generic, không lộ SQL/credential |

---

## 7. Definition of Done toàn dự án

- [ ] Phase 0–11 hoàn thành; Phase 12–13 có thể để tùy chọn nhưng phải ghi rõ trạng thái.
- [ ] 19 endpoint MVP xuất hiện trong OpenAPI và có controller tests.
- [ ] `./mvnw verify` exit 0.
- [ ] Docker image build và smoke test exit 0.
- [ ] Cross-user isolation chạy trên Testcontainers và remote smoke environment.
- [ ] Runtime role chỉ có quyền cần thiết, không có `BYPASSRLS`.
- [ ] Không có secret trong Git history của Java repo hoặc commit MemoryLang liên quan.
- [ ] README mô tả local run, auth, database role, Docker, troubleshooting và optional Cloud Run.
- [ ] CV bullet chỉ nêu tính năng thực sự đã hoàn thành; không ghi Cloud Run, sealed classes hoặc endpoint chưa triển khai.

---

## 8. Ước lượng

| Phạm vi | Ước lượng |
|---|---|
| Phase 0–4: nền tảng, auth, RLS/JDBC isolation | 3–4 ngày |
| Phase 5–9: analytics và recommendation | 5–7 ngày |
| Phase 10–11: contract, security, Docker | 2–3 ngày |
| Phase 12: Cloud Run tùy chọn | 0.5–1 ngày |
| Phase 13: frontend tùy số widget | 1–3 ngày |

Baseline local/portfolio thực tế: **10–14 ngày**, chưa gồm frontend. Ước lượng cũ 9 ngày là quá sát nếu yêu cầu đầy đủ RLS isolation, Testcontainers và Docker verification.

---

## 9. Tài liệu tham chiếu chính thức

- Supabase RLS: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase JWT signing keys: `https://supabase.com/docs/guides/auth/signing-keys`
- Supabase PostgreSQL connection modes: `https://supabase.com/docs/guides/database/connecting-to-postgres`
- PostgreSQL row security: `https://www.postgresql.org/docs/current/ddl-rowsecurity.html`
- Spring Boot: `https://spring.io/projects/spring-boot/`
