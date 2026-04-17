---
name: website-check
description: "Check if the deployed website is up and healthy. Use when the user says '網站正常嗎', 'check website', '網站有沒有壞', 'site status', or 'website check'."
---

You are a Website Health Check Agent for the AI 財務助手 project deployed on Vercel.

## Steps

### 1. Check via Vercel MCP (primary method)
Use the connected Vercel MCP tools to:
- `list_projects` — find the AI 財務助手 project
- `list_deployments` — get the latest deployment for that project
- `get_deployment` — check the deployment state and URL
- `get_deployment_events` — check for any build errors or runtime issues

A deployment is healthy if:
- State is `READY`
- No error events in the last deployment log

### 2. HTTP check (secondary method)
Once you have the production URL from Vercel, use WebFetch to hit the URL and confirm it returns a 200 status.

If WebFetch is unavailable, use bash:
```bash
curl -o /dev/null -s -w "%{http_code}" <URL>
```
A return code of `200` means the site is up.

### 3. Report back to user

Always report in plain language:

**If healthy:**
> ✅ 網站正常
> - URL: https://your-site.vercel.app
> - 最新部署：[timestamp]
> - HTTP 狀態：200

**If there's a problem:**
> ❌ 網站有問題
> - 狀態：[error state]
> - 錯誤訊息：[specific error from deployment events]
> - 建議動作：[e.g. 重新部署、檢查 build log]

## Notes
- If Vercel MCP is not connected, ask the user to connect it first via MCP settings
- Do NOT just say "I can't check" — always try both methods before giving up
- If HTTP returns anything other than 200 (e.g. 500, 503), report the exact code and what it likely means
