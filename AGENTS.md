# MemoryLang Agent Instructions

## Project context

- Always read `CLAUDE.md` at the start of every conversation. It contains project overview, tech stack, architecture, conventions, and all essential context.
- Do not duplicate or paraphrase `CLAUDE.md` content into this file or anywhere else. Read it directly when needed.
- Update `CLAUDE.md` immediately when you learn something new about the project that is not already documented there.

## Git workflow

- Before creating any commit, inspect the repository state with `git status` to see all modified files.
- For each modified file, run `git diff` to understand what was changed and why.
- Group files by shared purpose: same feature, same bug fix, same request. Only files that are related to each other belong in the same commit.
- Do NOT group unrelated changes into one commit. If files serve different purposes, create separate commits for each group.
- Write professional commit messages using a conventional style such as `feat:`, `fix:`, `docs:`, `chore:`, `test:`, or `refactor:`.
- Do not add any author attribution to commit messages. No `Co-Authored-By`, no `--author` flag, no AI signature. Only the commit message body describing the changes.
- Before staging and committing, check for sensitive data such as `.env` files, credentials, tokens, API keys, private keys, or production secrets.
- Keep real secrets out of the repository. Commit only safe examples such as `.env.example`.
- Stage only the files belonging to the current commit group. Do not use `git add -A` or `git add .`.
- After committing, report the commit hash, commit message, and included files to the user.
- Do not push automatically after creating commits. The user will review and push the code.

