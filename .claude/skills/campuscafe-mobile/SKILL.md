---
name: campuscafe-mobile
description: CampusCafe mobile guide — React Native (Expo+TypeScript) feature-sliced clean architecture, the features→shared rule, state strategy (React Query + Zustand), how to add a feature, run commands, backend contract. Use when editing anything under mobile/.
---

# CampusCafe Mobile — Skill

React Native (Expo + TypeScript) app with a **feature-sliced clean architecture**.

> Status: architecture/data layer is complete and typechecks. **Screen UI is
> intentionally not designed yet** — screens under `app/` are minimal placeholders
> wired to the ready-made hooks. (Design is produced separately, e.g. via the Rork
> prompt in `docs/rork-mobile-design-prompt.md`.)

## Architecture

```
app/                     Expo Router routes (thin — routing only)
  _layout.tsx            providers + headerless stack
  index.tsx              auth gate → redirects to /home or /login
  login.tsx, home.tsx    placeholders (no design)
src/
  app/providers.tsx      QueryClientProvider + SafeArea + auth bootstrap
  shared/                cross-cutting, feature-agnostic
    config/env.ts        API base URL from expo-constants (app.config.ts → extra)
    api/client.ts        axios instance: Bearer interceptor + error normalize + 401 hook
    api/query-client.ts  React Query client
    storage/secure-store.ts   JWT in device keychain (expo-secure-store)
    realtime/socket.ts   Socket.IO client (authenticated handshake)
    types/api.ts         shared DTOs (mirror backend contracts)
    theme/tokens.ts      design TOKENS (values only, not screens)
  store/auth.store.ts    Zustand — the one global client state (token/user/status)
  features/<feature>/    self-contained slices
    <f>.api.ts           endpoint calls via shared apiClient
    <f>.hooks.ts         React Query hooks (queries/mutations)
```

Features present: `auth`, `catalog`, `orders`.

## The one rule

`features/*` may import from `shared/` and `store/` — **never from another feature**.
That keeps every feature independently addable/removable:

- **Add a feature** = create `src/features/<name>/` with `.api.ts` + `.hooks.ts`, add a
  route file under `app/` that uses the hooks.
- **Remove a feature** = delete the folder + its route file. Nothing else breaks.

## State strategy

- **Server state** → React Query (`use*` hooks). Cache keys live in each feature's
  `*.hooks.ts` (e.g. `catalogKeys`, `orderKeys`). Mutations invalidate related keys.
- **Client state** → Zustand, only auth. Sign-in persists the token to secure storage
  and opens the socket; a 401 from any request auto-signs-out.

## Run

```bash
npm install
API_URL=http://<machine-lan-ip>:3000 npx expo start   # physical device needs LAN IP, not localhost
npm run typecheck
```

Config: `app.config.ts` reads `API_URL` env → `Constants.expoConfig.extra.apiUrl`,
consumed by `src/shared/config/env.ts`.

## Backend contract

Base URL `${API_URL}/api`. Auth via `Authorization: Bearer <jwt>`. Realtime via
Socket.IO with `auth.token`. DTOs are typed in `src/shared/types/api.ts` — keep them
in sync with `api/src/modules/*`.
