---
name: campuscafe-api
description: CampusCafe backend guide — Node+Express+TypeScript feature-modular layered architecture, Prisma/PostgreSQL data model, how to add a module, commands, auth/realtime, business rules. Use when editing anything under api/.
---

# CampusCafe API — Skill

Node + Express + TypeScript backend with a **feature-modular, layered** architecture
and Prisma/PostgreSQL.

## Architecture

```
src/
  config/       env.ts (zod-validated), logger.ts (pino), constants.ts (business rules)
  db/           prisma.ts (shared client singleton)
  shared/       errors.ts, jwt.ts, async-handler.ts, serialize.ts (Decimal→number)
  middleware/   auth.ts (JWT + requireRole), error-handler.ts
  realtime/     socket.ts (Socket.IO + JWT handshake; notifyUser/notifyCafe)
  modules/<feature>/
      <f>.routes.ts       HTTP routes (thin)
      <f>.controller.ts   parse/validate (zod) → call service → shape response
      <f>.service.ts      business rules (the testable core)
      <f>.repository.ts   Prisma data access
      <f>.schema.ts       zod DTOs
  routes.ts     central router — one line per module
  app.ts        express app (helmet, cors, rate-limit, json, error handler)
  server.ts     http + socket bootstrap, graceful shutdown
```

**Layer rule:** controller → service → repository → prisma. HTTP details never leak
below the controller; SQL/Prisma never leaks above the repository.

Modules: `auth`, `categories`, `cafes`, `products`, `orders`, `dashboard` (cafeOwner),
`loyalty`, `wallet`, `reviews`, `favorites`, `saved-drinks`, `campaigns` (public GET),
`menu` (cafeOwner product/campaign CRUD).

## Add a feature (folder + one line)

1. `src/modules/<feature>/` with `.routes/.controller/.service/.repository/.schema.ts`.
2. Register in `src/routes.ts`:
   ```ts
   import fooRoutes from '@/modules/foo/foo.routes';
   api.use('/foo', fooRoutes);
   ```
Remove a feature = delete the folder + its line. Thin modules may collapse
controller/repository into `service + routes` (see `wallet`, `favorites`).

## Commands

```bash
npm run dev            # tsx watch (needs .env with DATABASE_URL)
npm run build          # prisma generate + tsc + tsc-alias (rewrites @/* for runtime)
npm start              # node dist/server.js
npm run prisma:migrate # create+apply a dev migration
npm run prisma:deploy  # apply committed migrations (used by docker entrypoint)
npm run seed           # no-op by design (empty DB)
```

`.env` (see `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`,
`NODE_ENV`, `CORS_ORIGIN`, `RATE_LIMIT_*`.

## Data model (Prisma)

`prisma/schema.prisma` — snake_case tables via `@map`, enums for role/order status/
payment/option type/target role. Money = `Decimal(10,2)`. Normalized vs legacy:
`products.allergens` → `String[]`, `campaigns.relatedProductIds` → `Int[]`,
`savedDrinks.selectedOptions` → `Json`. Fresh DB via migrations; **no seed data**.

## Auth & realtime

- `authMiddleware` verifies Bearer JWT → `req.user = { id, role, firstName, cafeId }`.
- `requireRole('cafeOwner')` for owner-only routes.
- Socket.IO handshake requires `auth.token`; the server joins `user_<id>` and (owners)
  `cafe_<cafeId>` rooms itself. Emitted events: `new_order`, `order_status_changed`,
  `order_updated`, `order_item_cancelled`, `stars_earned`.

## Business rules (`config/constants.ts`)

- Loyalty stamps: `coffee` category purchases earn stamps at **any** cafe; 9 stamps → free coffee.
- Stars: every 10 currency spent earns 1 star × active campaign `starMultiplier`.

## Fixes applied vs the legacy backend

- Socket auth (no more eavesdropping on others' rooms).
- Star-earned notification now includes the campaign multiplier.
- Loyalty stamps work for all cafes (was hardcoded to cafe #2).
- Reorder goes through the normal order path (earns stars/stamps, applies payment).
- `Order.starsSpent` recorded → correct star history.
- Single authenticated campaign-creation path (removed the open, unauthenticated one).
- Rating recompute + wallet/item-cancel wrapped in transactions.
