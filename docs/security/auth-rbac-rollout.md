# Runbook triển khai xác thực, RBAC và MFA

## Mục tiêu

Tài liệu này hướng dẫn đưa lớp bảo vệ xác thực và phân quyền của MemoryLang lên môi trường staging rồi production. Quy trình giữ Supabase Auth làm nguồn danh tính, dùng RBAC trong schema riêng `security`, và yêu cầu MFA TOTP cùng phiên quản trị ngắn hạn cho các thao tác nhạy cảm.

## Điều kiện trước khi triển khai

- Sao lưu cơ sở dữ liệu production và ghi lại danh sách tài khoản đang có `profiles.is_admin = true` để người có thẩm quyền phê duyệt vai trò đích cho từng tài khoản.
- Tạo ít nhất hai tài khoản kiểm thử độc lập: một learner và một administrator đã có TOTP. Không dùng tài khoản production thường ngày cho kiểm thử.
- Đặt các secret AI chỉ trong Supabase Edge Function secrets. Xoay vòng Gemini key đã từng có khả năng xuất hiện phía client sau khi hotfix được triển khai.
- Chỉ triển khai sau khi tất cả lệnh kiểm thử cục bộ bên dưới hoàn tất với mã thoát `0`.

## Thứ tự triển khai

1. Triển khai các Edge Function đã được bảo vệ: `parse-exam-vision`, `test-ai-provider`, `manage-user-role`, `start-admin-session`, `revoke-admin-session`.
2. Áp dụng tuần tự các migration:

   ```text
   20260729093800_remove_client_secret_test_rpc.sql
   20260729095615_add_security_rbac_foundation.sql
   20260729100147_security_role_management_audit.sql
   20260729102121_add_admin_sessions.sql
   20260729102800_expose_admin_session_check.sql
   20260729102953_add_permission_summary_rpc.sql
   20260729112838_enforce_exam_permissions_through_rbac.sql
   20260729145652_assign-approved-production-rbac-roles.sql
   ```

3. Gán vai trò đã được phê duyệt bằng `manage-user-role`; không gán từ email hay JWT metadata. Cần giữ ít nhất hai `super_admin` độc lập để có đường khôi phục khẩn cấp.
4. Bật TOTP MFA trong Authentication settings của project production. `supabase/config.toml` chỉ kiểm soát môi trường local, không thay đổi cấu hình production.
5. Đăng nhập lại bằng một administrator, hoàn tất TOTP, bắt đầu admin session và kiểm thử các thao tác được cấp quyền.
6. Triển khai frontend sau cùng để UI dùng permission summary thay cho boolean `profile.is_admin`.

## Lệnh kiểm chứng trước release

```powershell
pnpm test
pnpm tsc -b
pnpm lint
npx supabase db reset --local
npx supabase test db --local supabase/tests/database/security_rbac.test.sql supabase/tests/database/security_role_management_audit.test.sql supabase/tests/database/admin_sessions.test.sql
```

Để xem trước migration production, chạy dry-run của Supabase rồi kiểm tra danh sách migration bằng `scripts/check-supabase-migration-dry-run.mjs`. Chỉ cho phép đúng các migration của release, không áp dụng migration không nằm trong danh sách phê duyệt.

## Kiểm chứng staging/production

- Learner không thể gọi `parse-exam-vision`, `test-ai-provider`, `manage-user-role` hoặc đọc khoá nhà cung cấp.
- `exam_admin` chỉ quản lý nội dung exam; không thể gán vai trò.
- `security_admin` không thể đọc hoặc thay đổi exam content.
- Một admin AAL1, hoặc một admin session hết hạn/bị thu hồi, bị từ chối ở các Edge Function nhạy cảm.
- Thu hồi vai trò làm mọi admin session còn hiệu lực của người đó bị vô hiệu ngay trong lần kiểm tra quyền kế tiếp.
- Thử gọi PostgREST/RPC trực tiếp với learner A để đọc hoặc sửa dữ liệu của learner B phải bị từ chối.
- Kiểm tra `security.audit_logs` có event role/session tương ứng, request ID và lý do; không chứa TOTP secret, API key, OCR/image payload hay dữ liệu bí mật.

## Rollback và khôi phục

Không rollback migration bảo mật bằng cách nới RLS hay mở lại RPC trả secret. Nếu release gặp sự cố, dừng deploy frontend/Edge Function, dùng một `super_admin` đã được phê duyệt để thu hồi role/session không hợp lệ, và áp dụng migration khắc phục có kiểm thử. Khi mất toàn bộ quyền quản trị, dùng quy trình khôi phục khẩn cấp ngoài UI với quyền database hạn chế, tạo một role grant có lý do và lưu bằng chứng trong audit log.

## Giới hạn chuyển tiếp đang được quản lý

`profiles.is_admin` còn tồn tại để tương thích với các phần cũ của ứng dụng. Không dùng trường này để cấp quyền cho tính năng mới; mọi tính năng mới phải dùng permission code, RLS/RPC hoặc Edge Function đã xác thực. Chỉ xoá compatibility bridge sau khi inventory đầy đủ các policy, RPC, Storage policy và client call site không còn tham chiếu nó.
