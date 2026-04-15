#!/usr/bin/env bash
# 自動 commit + push - 由 Claude Code PostToolUse hook 呼叫
cd "c:/Users/zcbm3/Desktop/成本計算/sales-tracker" || exit 0
# 沒變動就跳過
git diff --quiet && git diff --cached --quiet && exit 0
git add -A
git -c user.email=claude@local -c user.name=claude commit -m "auto: update by Claude $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1
git push origin main >/dev/null 2>&1
exit 0
