# CampusCafe

Smart campus dining app. Students browse cafes and menus, customize and place orders,
track them in real time, and earn stars & loyalty stamps. Cafe owners manage their
menu and campaigns and get a live orders dashboard with analytics.

Rebuilt from the ground up:

- **Backend** — Node + Express + **TypeScript**, feature-modular layered architecture
- **Database** — **PostgreSQL + Prisma** (migrations; no seed fixtures — real data only)
- **Mobile** — **React Native (Expo + TypeScript)**, feature-sliced clean architecture
- **Infra** — one-command **Docker Compose** (Postgres + API)

> The previous Angular frontend and Express/SQLite backend are archived under
> `legacy/` for reference. The old Python AI service has been removed.

## Quick start (backend)

```bash
docker compose up --build
```

Starts PostgreSQL (database **`campuscafe`**) and the API at `http://localhost:3000`.
Migrations apply automatically; the database starts **empty** and is filled with real
cafes/products through the app. Health check: `GET /api/health`.

Configuration is via environment variables with sensible defaults — copy
`.env.example` → `.env` to override (`POSTGRES_*`, `JWT_SECRET`, `API_PORT`, `CORS_ORIGIN`).

## Quick start (mobile)

```bash
cd mobile && npm install
API_URL=http://<your-machine-ip>:3000 npx expo start
```

## Project layout

```
api/     Node + Express + TS backend
mobile/  React Native (Expo + TS) app
legacy/  Archived old frontend + backend
docs/    Historical planning documents + Rork design prompt
docker-compose.yml
```

## Documentation (Claude Code skills)

- [`.claude/skills/campuscafe`](.claude/skills/campuscafe/SKILL.md) — project overview & how to run
- [`.claude/skills/campuscafe-api`](.claude/skills/campuscafe-api/SKILL.md) — backend architecture, modules, commands
- [`.claude/skills/campuscafe-mobile`](.claude/skills/campuscafe-mobile/SKILL.md) — mobile clean architecture
