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

Recommended env vars:
- `DATABASE_URL` = Supabase pooler URL (IPv4-friendly)
- `DIRECT_URL` = Supabase direct URL (for migrations)
- `JWT_SECRET` = random secret
- `JWT_EXPIRES_IN` = `7d`
- `FRONTEND_URL` = your Railway frontend URL
- `NODE_ENV` = `production`
- `RESEND_API_KEY` (optional)
- `RESEND_FROM_EMAIL` (optional)

Health check:
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
