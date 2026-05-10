# MemoryLang Agent Instructions

## Git workflow

- Before creating any commit, inspect the repository state with `git status`.
- Review the changed files and group them by feature, responsibility, or user request.
- Write professional commit messages using a conventional style such as `feat:`, `fix:`, `docs:`, `chore:`, `test:`, or `refactor:`.
- Do not use `--author` or otherwise override the Git author when committing.
- Before staging and committing, check for sensitive data such as `.env` files, credentials, tokens, API keys, private keys, or production secrets.
- Keep real secrets out of the repository. Commit only safe examples such as `.env.example`.
- Run the needed `git add` and `git commit` commands after preparing the commit content.
- After committing, report the commit hash, commit message, and included files to the user.
- Do not push automatically after creating commits. The user will review and push the code.

