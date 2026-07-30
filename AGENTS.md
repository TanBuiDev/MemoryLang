# MemoryLang Agent Instructions

## Project context

- Always read `CLAUDE.md` at the start of every conversation. It contains project overview, tech stack, architecture, conventions, and all essential context.
- Do not duplicate or paraphrase `CLAUDE.md` content into this file or anywhere else. Read it directly when needed.
- Update `CLAUDE.md` immediately when you learn something new about the project that is not already documented there.

## Quy tắc ngôn ngữ (Language Rules)

- **Language Mirroring:** Luôn phản hồi bằng ngôn ngữ mà người dùng đang sử dụng để đặt câu hỏi. Nếu hỏi bằng tiếng Anh, trả lời bằng tiếng Anh. Nếu hỏi bằng tiếng Việt, trả lời bằng tiếng Việt.

### Quy tắc tiếng Việt (Chỉ áp dụng khi người dùng hỏi bằng tiếng Việt)

- **Yêu cầu bắt buộc:** PHẢI sử dụng tiếng Việt có dấu chuẩn Unicode (UTF-8) trong mọi phản hồi, giải thích và comment code. Tuyệt đối KHÔNG viết tiếng Việt không dấu hoặc thiếu dấu.
- **Tự sửa lỗi:** Trước khi output, kiểm tra lại toàn bộ văn bản. Nếu phát hiện bất kỳ từ tiếng Việt nào không dấu, viết lại toàn bộ câu/phản hồi đó.
- **Thuật ngữ chuyên ngành:** Chỉ giữ nguyên tiếng Anh cho các thuật ngữ kỹ thuật, tên hàm, biến hoặc công nghệ.

## Git workflow

- **Commit after every feature or fix.** This project runs in production. Create a commit immediately after completing any feature, bug fix, or refactor. Do not batch multiple unrelated tasks into one commit.
- All commit messages must be written in **English** using conventional commit style (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Before creating any commit, inspect the repository state with `git status` to see all modified files.
- For each modified file, run `git diff` to understand what was changed and why.
- **Atomic commits — one feature per commit.** Never bundle multiple unrelated features into a single commit. Each commit should represent one logical unit of change. If changes span 3+ distinct features, split them into separate commits. Aim for 3–10 files per commit; if you have 20+ files, you are likely bundling too many features.
- Group files by shared purpose: same feature, same bug fix, same request. Only files that are related to each other belong in the same commit.
- Do NOT group unrelated changes into one commit. If files serve different purposes, create separate commits for each group.
- Do not add any author attribution to commit messages. No `Co-Authored-By`, no `--author` flag, no AI signature. Only the commit message body describing the changes.
- Before staging and committing, check for sensitive data such as `.env` files, credentials, tokens, API keys, private keys, or production secrets.
- Keep real secrets out of the repository. Commit only safe examples such as `.env.example`.
- Stage only the files belonging to the current commit group. Do not use `git add -A` or `git add .`.
- After committing, report the commit hash, commit message, and included files to the user.
- Do not push automatically after creating commits. The user will review and push the code.

## Quy tắc Kiểm tra Build & Type-checking (Bắt buộc tuyệt đối)

- **BẮT BUỘC kiểm tra build thành công trước khi commit:** Trước khi tạo bất kỳ git commit nào, AI BẮT BUỘC phải chạy lệnh `pnpm tsc -b` hoặc `pnpm build` đồng bộ và ĐẢM BẢO kết quả trả về thành công 100% (exit code 0, không có lỗi TS hay lint).
- **TUYỆT ĐỐI KHÔNG commit khi lệnh build chưa hoàn thành:** Không tạo commit khi lệnh `tsc` hoặc `build` vẫn đang chạy ngầm trong background task mà chưa trả về kết quả hoàn tất.
- **Dọn dẹp triệt để các tham chiếu biến:** Khi refactor hoặc xóa bớt state/import/biến, PHẢI kiểm tra tất cả các vị trí gọi/sử dụng biến đó trong toàn bộ file để xóa sạch sẽ, tránh để lại biến chưa khai báo (`TS2304`).

## Quy tắc UI/UX & Vibecoding (Bắt buộc tuyệt đối)

Để đảm bảo tính nhất quán của thiết kế Neobrutalist và trải nghiệm người dùng, AI PHẢI tuân thủ các quy tắc sau khi sinh code giao diện:

### 1. Quy tắc Xác nhận hành động (Confirmation Dialogs)
- **TUYỆT ĐỐI KHÔNG** sử dụng `window.confirm()`, `window.alert()`, `window.prompt()` hoặc bất kỳ dialog mặc định nào của trình duyệt.
- **BẮT BUỘC** sử dụng component `ConfirmModal` từ `@/components/ui/confirm-modal` cho MỌI hành động cần xác nhận (xóa từ vựng, hủy session, rời trang, reset dữ liệu).
- **Pattern bắt buộc:** 
  1. Tạo state để lưu hành động chờ (ví dụ: `const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)`).
  2. Render component: `<ConfirmModal open={!!pendingDeleteId} onConfirm={() => handleDelete(pendingDeleteId)} onCancel={() => setPendingDeleteId(null)} title="..." description="..." />`.
  3. Trigger bằng cách set state: `onClick={() => setPendingDeleteId(item.id)}`.

### 2. Quy tắc Dropdown & Form Controls
- **TUYỆT ĐỐI KHÔNG** sử dụng thẻ `<select>` và `<option>` mặc định của HTML. Chúng phá vỡ hoàn toàn phong cách Neobrutalist của dự án.
- **BẮT BUỘC** sử dụng component `Select` của dự án từ `@/components/ui/select`.
- **Cách sử dụng:** Component này nhận một prop `options` dạng mảng các đối tượng `{ value: string, label: string }`. **TUYỆT ĐỐI KHÔNG** sử dụng cấu trúc phân cấp kiểu shadcn (`SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) vì component `Select` hiện tại trong dự án được thiết kế dưới dạng một component đóng gói duy nhất nhận prop `options`.
  Ví dụ sử dụng đúng:
  ```tsx
  import { Select } from '@/components/ui/select';
  
  // Trong component:
  <Select 
    value={value} 
    onChange={setValue} 
    options={[
      { value: 'option1', label: 'Tùy chọn 1' },
      { value: 'option2', label: 'Tùy chọn 2' }
    ]} 
    placeholder="Chọn một tùy chọn..."
  />
  ```

### 3. Quy tắc Tái sử dụng Component (DRY UI)
- Trước khi tạo một button, input, card, hoặc badge mới, PHẢI kiểm tra thư mục `src/components/ui/` và `src/components/common/`.
- Với mọi nút hiển thị trong page, modal, drawer, toast action, form action hoặc confirmation flow, PHẢI dùng component `Button` từ `@/components/ui/button` với `variant` phù hợp (`primary`, `secondary`, `ghost`, `danger`). KHÔNG dùng raw `<button>` tự gắn `neo-button` thủ công, trừ trường hợp đó là icon-only/specialized control đã có pattern rõ trong codebase và phải giữ đủ các class nền tảng của `Button` (`inline-flex`, `min-h-10`, `items-center`, `justify-center`, `font-black`, `active:neo-button-active`).
- Nút hủy/đóng trong modal phải dùng `<Button variant="ghost">`, nút hành động chính dùng `primary` hoặc `secondary`, hành động phá hủy dùng `danger`. Không tự tạo style riêng cho các nút này.
- Luôn ưu tiên sử dụng các class utility có sẵn như `neo-card`, `neo-button`, `neo-button-active` thay vì tự viết CSS inline hoặc Tailwind class từ con số 0.
- Nếu phát hiện code cũ đang dùng `<select>` hoặc `window.confirm`, nhiệm vụ đầu tiên của AI là refactor (tái cấu trúc) chúng sang custom component ngay lập tức.

### 4. Quy tắc chống "Developer-Centric UI" (Cực kỳ quan trọng)
- **TUYỆT ĐỐI KHÔNG** dùng `<textarea>` để nhập JSON, HTML, CSS, SQL hoặc bất kỳ đoạn code/config nào. Bắt buộc dùng Form controls trực quan (Input, Select, Toggle, Checkbox).
- **TUYỆT ĐỐI KHÔNG** yêu cầu user/admin viết raw code. Bắt buộc dùng WYSIWYG editor (cho văn bản) hoặc Visual Builder (cho cấu hình phức tạp).
- **BẮT BUỘC** thiết kế cho người dùng KHÔNG rành kỹ thuật (Non-technical). Mọi tùy chọn phải có Label rõ ràng, có giá trị mặc định và hiển thị Preview ngay lập tức.
- **Nếu phát hiện code cũ vi phạm** (ví dụ: đang dùng textarea nhập JSON), nhiệm vụ đầu tiên là refactor sang visual form trước khi làm tính năng mới.

## Quy tắc tích hợp Supabase / PostgREST (Bắt buộc tuyệt đối)

- **Giới hạn kết quả (1000-row PostgREST limit):**
  - Cơ chế mặc định của PostgREST/Supabase giới hạn kết quả trả về của các truy vấn `select` tối đa là **1000 dòng**.
  - **KHÔNG ĐƯỢC** tải toàn bộ dữ liệu về Client bằng cách gọi truy vấn `select` chung rồi tính toán `length` trên mảng kết quả nếu tổng số dòng trong DB có thể lớn hơn 1000.
  - **BẮT BUỘC** sử dụng truy vấn đếm dòng (`{ count: 'exact', head: true }`) của Supabase khi cần lấy số lượng dòng (total/count) của một bảng.
  - Khi cần tải danh sách dữ liệu có khả năng vượt quá 1000 dòng để xử lý (ví dụ: tác vụ chạy hàng loạt), phải đặt rõ giới hạn `.limit(...)` (ví dụ: `.limit(10000)`) hoặc thực hiện phân trang (pagination) phù hợp.

## Quy tắc Frontend Deployment / Dynamic Import (Bắt buộc)

- Khi thêm route hoặc page dùng `React.lazy`, PHẢI dùng `lazyWithChunkRecovery()` từ `src/utils/chunkLoadRecovery.ts`, không gọi `React.lazy(() => import(...))` trực tiếp cho route lazy-load.
- Nếu production báo `Failed to fetch dynamically imported module: .../assets/*.js`, trước tiên phải xem đây là lỗi stale SPA/chunk sau deploy: kiểm tra URL chunk, `Content-Type`, `Cache-Control`, và hash `index-*.js` hiện tại trên custom domain.
- KHÔNG cấu hình cache `immutable` dài hạn cho JavaScript/CSS chunks trong `public/_headers`. JS/CSS phải `max-age=0, must-revalidate`; stale chunk fallback được xử lý bằng `lazyWithChunkRecovery()`, không xử lý bằng top-level `404.html`.
- KHÔNG thêm rule rewrite 404 kiểu `/assets/* /404.html 404` vào `public/_redirects`. Cloudflare Pages chỉ hỗ trợ rewrite/proxy status `200`; rule 404 không hợp lệ có thể làm hỏng SPA fallback và khiến direct route như `/app/admin` trả trang "Không tìm thấy tài nguyên".
- KHÔNG tạo top-level `public/404.html` cho SPA này. Cloudflare Pages xem sự tồn tại của root `404.html` là tín hiệu dùng Not Found behavior thay vì SPA rendering, khiến URL trực tiếp như `/app/admin` có thể trả 404 trước khi React Router chạy.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MemoryLang** (8269 symbols, 13960 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MemoryLang/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MemoryLang/clusters` | All functional areas |
| `gitnexus://repo/MemoryLang/processes` | All execution flows |
| `gitnexus://repo/MemoryLang/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
