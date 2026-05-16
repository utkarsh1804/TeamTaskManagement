# Railway Deployment

This repo contains two services:
- Backend (Express + Prisma) in `backend/`
- Frontend (Vite + React) in `frontend/`

## 1) Push to GitHub
- Commit your changes and push the repo to GitHub.

## 2) Backend service (Railway)
Create a Railway service from the repo and set:
- **Root Directory**: `backend`
- **Start Command**: `npm run start:railway`

### Required env vars
| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase pooler URL | IPv4-friendly connection string |
| `DIRECT_URL` | Supabase direct URL | For Prisma migrations |
| `JWT_SECRET` | Random secret | Generate with `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `FRONTEND_URL` | `https://frontendteamtask.up.railway.app` | Your Railway frontend URL |
| `NODE_ENV` | `production` | Required for secure cookies |

### Email setup (Resend)
1. Go to [resend.com](https://resend.com) and create an API key
2. Add the API key to Railway: `RESEND_API_KEY=re_...`
3. **Option A - Testing (no domain verification needed):**
   - Set `RESEND_FROM_EMAIL=TeamTask <onboarding@resend.dev>`
   - Limited to 100 emails/day, works immediately
4. **Option B - Production (custom domain):**
   - In Resend, add and verify your domain: `frontendteamtask.up.railway.app`
   - Add the DNS records Resend provides to your domain registrar
   - Once verified, set `RESEND_FROM_EMAIL=TeamTask <noreply@frontendteamtask.up.railway.app>`

### Health check
- `GET /api/health`

## 3) Frontend service (Railway)
Create another Railway service and set:
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

Env vars:
- `VITE_API_URL` = `https://<your-backend-domain>/api`

## 4) Post-deploy checks
- Open the frontend URL and confirm login/registration.
- Create a project, add a member, and create tasks.
- Check `/api/health` on the backend.

## Supabase connection strings
Use the pooler for runtime, and direct for migrations:
```
DATABASE_URL=postgresql://postgres.<ref>:<PASSWORD>@aws-1-...pooler.supabase.com:5432/postgres?sslmode=require
DIRECT_URL=postgresql://postgres:<PASSWORD>@db.<ref>.supabase.co:5432/postgres?sslmode=require
```
