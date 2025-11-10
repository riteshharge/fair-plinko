# Deployment to Render — Steps & Environment Variables

This project contains two services: backend (Express + Prisma) and frontend (React/Vite).
Below are minimal steps to deploy both to Render.

## Required environment variables
- DATABASE_URL — Postgres connection string for Prisma. Example:
  `postgresql://user:password@host:5432/dbname`
- NODE_ENV — set to `production` for backend

## Using render.yaml (included)
1. Push this repository to a Git remote (GitHub).
2. In Render, create a new "New Web Service" from `git` and connect the repo OR use the `render.yaml` to create services automatically.
3. Ensure `plinko-backend` has `DATABASE_URL` set in Render dashboard.
4. For frontend, `plinko-frontend` service builds frontend and serves `frontend/dist`.

## Manual commands (for local simulation)
Backend:
```bash
cd backend
npm install
# set up .env with DATABASE_URL or use SQLite in .env
npx prisma generate
npx prisma migrate dev --name init
npm run build || true
npm start
```

Frontend:
```bash
cd frontend
npm install
npm run build
# Serve frontend/dist with a static server or let Render serve it.
```

## Notes
- In production, persist commit/serverSeed to DB. Currently backend keeps seeds in memory — consider migrating to using Prisma to store rounds.
- Make sure to set correct CORS/origin settings if frontend and backend are on different domains.
