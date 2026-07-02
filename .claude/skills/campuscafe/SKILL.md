---
name: campuscafe
description: CampusCafe project overview — how to run the backend (Docker) and mobile (Expo), repo layout, tech stack and conventions. Use when working anywhere in the CampusCafe repo or when asked how to run/set up the project.
---

# CampusCafe — Project Skill

Campus dining app: students browse cafes/menus, customize & order, track orders in
real time, earn stars & loyalty stamps; cafe owners manage menus/campaigns and see
live orders + analytics.

## Repository layout

```
campuscafe/
  api/        Backend — Node + Express + TypeScript (feature-modular, layered)
  mobile/     App    — React Native (Expo + TypeScript), feature-sliced clean architecture
  legacy/     Archived old code (Angular frontend + Express/SQLite backend) — reference only
  docs/       Historical planning docs + Rork design prompt
  .claude/skills/   Project skills (this file, campuscafe-api, campuscafe-mobile)
  docker-compose.yml
```

Deep-dive skills: **campuscafe-api**, **campuscafe-mobile**.

## Run the backend (one command)

```bash
docker compose up --build
```

Brings up **PostgreSQL** (database `campuscafe`) + the **API** on `http://localhost:3000`.
Migrations apply automatically on startup. The database starts **empty by design** —
real cafes/products are created through the app (cafe-owner registration + menu
management), not via seed fixtures.

- Health: `GET http://localhost:3000/api/health`
- Config via env (defaults exist): `POSTGRES_*`, `JWT_SECRET`, `API_PORT`, `CORS_ORIGIN`.
  Copy `.env.example` → `.env` to override.
- Note: if host port 5432 is busy, `.env` here sets `POSTGRES_PORT=5433` for publishing.

## Run the mobile app

```bash
cd mobile
npm install
API_URL=http://<your-machine-ip>:3000 npx expo start
```

(UI screens are intentionally not designed yet — the clean architecture/data layer is
in place; see the campuscafe-mobile skill.)

## Tech stack

| Part      | Stack |
|-----------|-------|
| Backend   | Node, Express 4, TypeScript, Prisma, PostgreSQL, Socket.IO, zod, pino |
| Mobile    | Expo, React Native, TypeScript, Expo Router, React Query, Zustand, expo-secure-store |
| Infra     | Docker Compose (postgres + api) |

## Conventions

- Money is stored as `Decimal(10,2)` and serialized to plain numbers in responses.
- Auth: JWT Bearer tokens; roles `student` / `teacher` / `cafeOwner`.
- Realtime: Socket.IO requires an authenticated handshake; rooms are derived
  server-side from the token (clients cannot subscribe to arbitrary users/cafes).
