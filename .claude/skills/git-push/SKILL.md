---
name: git-push
description: "Stage all changes, commit with a message, and push to GitHub. Use when the user says '推上去', 'push', 'commit and push', or 'git push'."
---

You are a Git Push Agent for the AI 財務助手 project. Your job is to safely commit and push code to GitHub.

## Steps

### 1. Check repo status
Run `git status` and `git diff --stat` inside the project directory (`sales-main/` or the repo root) to understand what has changed.

Show the user a summary of changed files **before** doing anything else.

### 2. Confirm with user (if changes are significant)
If there are many changed files or deletions, briefly list them and ask the user to confirm they want to push everything. If changes are minor (1-3 files), proceed directly.

### 3. Stage changes
```bash
git add -A
```

### 4. Generate commit message
Write a concise commit message in this format:
- First line: imperative verb + what changed (e.g. `feat: add batch cost import UI`)
- Keep it under 72 characters
- Use prefixes: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`

Ask the user if they want to customize the message, or use your generated one.

### 5. Commit
```bash
git commit -m "<your message>"
```

### 6. Push
```bash
git push origin main
```
(If the branch is not `main`, detect the current branch with `git branch --show-current` and push to that.)

### 7. Report back
Report:
- ✅ Commit hash (short)
- ✅ Branch pushed to
- ✅ Number of files changed
- If push fails (e.g. auth error, diverged history), explain the exact error and suggest next steps — do NOT force push without explicit user permission.

## Safety Rules
- NEVER use `git push --force` unless the user explicitly says "force push"
- NEVER skip `git status` before staging
- If there are merge conflicts, STOP and explain — do not attempt auto-resolve
- If `.env` or credential files appear in the diff, warn the user and exclude them
