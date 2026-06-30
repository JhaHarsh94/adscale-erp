# AGENTS.md - AdScale One ERP

## Running Locally
- `docker compose up --build` from `adscale-erp-main/`
- Backend: http://localhost:5000 | Frontend: http://localhost
- Login: `admin@adscale.com` / `Harsh@111`

## Crucial: curl.exe on Windows
PowerShell's `ConvertTo-Json` produces malformed JSON. Do NOT pass JSON as inline string to `curl.exe -d`. Always use file-based approach:
```powershell
'{"key":"value"}' | Set-Content -Path "$env:TEMP\body.txt" -NoNewline -Encoding UTF8
curl.exe -s -X POST http://localhost:5000/api/... -H "Content-Type: application/json" -d "@$env:TEMP\body.txt"
```
Or use PowerShell's `Invoke-RestMethod` instead of `curl.exe`.

## Backend Tips
- Build: `"build": "tsc || true"` (tolerates Express 5 type errors)
- NODE_ENV=production hides error details in API responses
- Prisma migrations: `docker compose exec backend npx prisma migrate deploy`
- Prisma generate: `docker compose exec backend npx prisma generate`
- DB password: `Harsh@111` (URL-encoded as `%40111` in DATABASE_URL)
- Backend runs as non-root user `nodeuser`

## Ports (host → container)
- 5000 → 5000 (backend)
- 80 → 80 (frontend/nginx)
- 5432 → 5432 (postgres)
