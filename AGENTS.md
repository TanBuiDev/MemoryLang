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

- Before creating any commit, inspect the repository state with `git status` to see all modified files.
- For each modified file, run `git diff` to understand what was changed and why.
- **Atomic commits — one feature per commit.** Never bundle multiple unrelated features into a single commit. Each commit should represent one logical unit of change (e.g., "add term relationships", "enhance vocabulary management", "improve deck management"). If changes span 3+ distinct features, split them into separate commits. Aim for 3–10 files per commit; if you have 20+ files, you are likely bundling too many features.
- Group files by shared purpose: same feature, same bug fix, same request. Only files that are related to each other belong in the same commit.
- Do NOT group unrelated changes into one commit. If files serve different purposes, create separate commits for each group.
- Write professional commit messages using a conventional style such as `feat:`, `fix:`, `docs:`, `chore:`, `test:`, or `refactor:`.
- Do not add any author attribution to commit messages. No `Co-Authored-By`, no `--author` flag, no AI signature. Only the commit message body describing the changes.
- Before staging and committing, check for sensitive data such as `.env` files, credentials, tokens, API keys, private keys, or production secrets.
- Keep real secrets out of the repository. Commit only safe examples such as `.env.example`.
- Stage only the files belonging to the current commit group. Do not use `git add -A` or `git add .`.
- After committing, report the commit hash, commit message, and included files to the user.
- Do not push automatically after creating commits. The user will review and push the code.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MemoryLang** (3304 symbols, 5670 relationships, 262 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
