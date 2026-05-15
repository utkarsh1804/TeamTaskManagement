# Full Stack Assessment

Monorepo with two services:
- Backend: Express + Prisma in `backend/`
- Frontend: Vite + React in `frontend/`

## Local setup
1) Backend
- Create `backend/.env` from `backend/.env.example`
- Install deps: `cd backend && npm install`
- Sync schema: `npx prisma db push`
- Run: `npm run dev`

2) Frontend
- Create `frontend/.env` from `frontend/.env.example`
- Install deps: `cd frontend && npm install`
- Run: `npm run dev`

## Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for Railway steps.
