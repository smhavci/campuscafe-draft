# Rork Prompt — CampusCafe Mobile (all screens)

Paste the block below into Rork. It is written in English for reliable generation,
but **all user-facing copy must be Turkish** (examples included). It matches the
existing CampusCafe backend API contract so the generated UI wires to our real
endpoints with minimal changes.

If Rork truncates, build in the phases listed under "BUILD ORDER".

---

Build **CampusCafe**, a production-quality campus coffee & food ordering app in
**React Native (Expo, TypeScript, Expo Router)**. Two roles share one app:
**students/teachers** (order & rewards) and **cafe owners** (dashboard & menu).
Prioritize a beautiful, modern, cohesive UI with real screens, states, and polish.
All visible text is in **Turkish**.

## Brand & design system
- Theme: warm, cozy specialty-coffee + campus. Clean, airy, rounded, soft shadows.
- Colors: primary `#C8A97E` (coffee tan); per-cafe accent colors `#C8A97E`, `#E07A5F`,
  `#81B29A`, `#D4A574` (use each cafe's `color` field as its accent); background
  `#FFFFFF` and soft `#F7F3EE`; text `#1A1A1A`, muted `#6B7280`; success `#3FA34D`;
  danger `#E05252`; star/gold `#F2B705`.
- Typography: bold, confident headings; clean sans body (Inter or system). Clear hierarchy.
- Components: rounded cards (radius 12–20), pill chips, soft elevation, big tappable
  buttons, coffee photography (Unsplash), emoji category chips (☕ 🧊 🍰 🍽️ 🥐).
- Include loading **skeletons**, friendly **empty states**, and **toast**
  notifications for success/error. Support light theme (optionally dark).
- Gamified rewards visuals: star balance badge, loyalty stamp cards (9 stamps → free coffee).

## Backend integration (real API)
- REST base URL: `${API_URL}/api` (configurable via env; default `http://localhost:3000/api`).
- Auth: `Authorization: Bearer <JWT>`. Store token in expo-secure-store. Roles:
  `student` | `teacher` | `cafeOwner`.
- Server state via React Query; only auth in a global store (Zustand).
- Realtime via Socket.IO at `${API_URL}` with `auth: { token }`. Listen to:
  `order_status_changed`, `new_order`, `order_updated`, `stars_earned`,
  `order_item_cancelled` → drive toasts + refetch.
- Key endpoints (method path → purpose):
  - `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me`
  - `GET /cafes`, `GET /cafes/:slug`, `GET /cafes/:slug/products`, `GET /cafes/:slug/campaigns`
  - `GET /products`, `GET /products/:id` (with options), `GET /products/search?q&minPrice&maxPrice&category`
  - `GET /categories`, `GET /campaigns`
  - `POST /orders` (items[{productId,quantity,options?:number[],note?,discount?}], cafeId, pickupTime?, paymentMethod: credit_card|wallet|stars), `GET /orders`, `GET /orders/:id`, `GET /orders/:id/timeline`, `POST /orders/reorder/:id`
  - `GET /wallet`, `POST /wallet/topup {amount}`
  - `GET /loyalty`, `GET /loyalty/status`, `GET /loyalty/history`, `GET /loyalty/coffees/:cafeId`, `POST /loyalty/redeem {cafeId,productId}`
  - `POST /reviews {productId,orderId,rating,comment}`, `GET /reviews/product/:productId`, `GET /reviews/user`
  - `GET /favorites`, `GET /favorites/ids`, `POST /favorites/:productId` (toggle)
  - `GET /saved-drinks`, `POST /saved-drinks`, `DELETE /saved-drinks/:id`
  - Owner: `GET /dashboard/orders`, `GET /dashboard/history?status&date&page&limit`,
    `PATCH /dashboard/orders/:id/status {status}`, `PATCH /dashboard/orders/:orderId/items/:itemId/cancel {reason}`,
    `GET /dashboard/analytics`, `/analytics/weekly`, `/analytics/hourly`, `/analytics/customers`
  - Owner menu: `GET/POST /menu/products`, `PATCH/DELETE /menu/products/:id`,
    `GET/POST /menu/campaigns`, `PATCH/DELETE /menu/campaigns/:id`
- Money values are plain numbers (e.g. 48). Prices in Turkish Lira (₺).

## Navigation
- **Guest stack:** Login, Register (2-step: pick role → fill details; cafeOwner picks a cafe).
- **Student/teacher — bottom tabs:** Ana Sayfa (Home), Keşfet (Explore/Menu), Siparişler
  (Orders), Ödüller (Rewards), Profil (Profile). Stack screens pushed above tabs:
  Cafe Detail, Product Detail (modal sheet), Arama (Search), Kampanyalar (Campaigns),
  Sepet (Cart), Order Tracking, Cüzdan (Wallet), Favoriler, Kayıtlı İçecekler, Harita (Map).
- **Cafe owner — separate area after login:** bottom tabs Panel (Dashboard), Menü Yönetimi
  (Menu Management), Profil. (Owners do not see the student shopping flow.)
- Auth-gate on launch: token present → role-based home; else Login.

## SCREENS (build all)

### Auth
1. **Login** — role segmented control (Öğrenci / Öğretmen / Kafe). Öğrenci: student number
   + password; others: email + password. Big primary button, link to Register, error toast.
2. **Register** — step 1 role cards; step 2 fields (first/last name, password; student number
   for students; email for teacher/owner; cafe picker for owners from `GET /cafes`). Inline validation.

### Student / Teacher
3. **Ana Sayfa (Home)** — greeting + star balance badge; live open/closed clock; horizontal
   featured **campaign** carousel; **cafe** list cards (image, name, rating ⭐, open hours,
   accent color, location). Pull-to-refresh.
4. **Keşfet / Menü (Explore)** — category chips filter (from `/categories`), searchable product
   grid/list across cafes (`/products`), each product card shows image, name, price ₺, cafe,
   calories, favorite heart toggle. Tap → Product Detail.
5. **Cafe Detail** — hero image + accent color, rating, hours, location, description; tabs/sections
   "Menü" (products grouped by category) and "Kampanyalar"; sticky "Sepete Git" if cart has items.
6. **Product Detail (modal/sheet)** — image, description, calories, allergens, ingredients;
   **customization** from product `options` (radio = Süt Seçimi/Boyut required; checkbox = Şurup/
   Ekstra Shot) with live price update; quantity stepper; note field; "Sepete Ekle" + "Tarifi Kaydet"
   (saved drink). Show reviews summary (avg ⭐ + count) with a "Yorumları Gör" expand.
7. **Arama (Search)** — search bar + filters (price min/max, category); results list; empty state.
8. **Kampanyalar (Campaigns)** — all active campaigns as rich cards (badge, discount, validity,
   target role, cafe); tap links to related cafe/products.
9. **Sepet (Cart)** — line items (image, name, options, note, qty edit, remove), single-cafe lock
   note, subtotal/discount/total, payment method selector (Kredi Kartı / Cüzdan / Yıldız — show
   wallet balance & star cost), pickup time picker, "Siparişi Onayla". Empty-cart state.
10. **Siparişler (Orders)** — list of orders with status pill (Hazırlanıyor/Hazır/Teslim/İptal),
    total, cafe, date. Tap → **Order Tracking**: status timeline (from `/orders/:id/timeline`),
    items, "Tekrar Sipariş Ver" (reorder), and per delivered item "Değerlendir" (rating 1–5 + comment).
    Live status updates via socket + toast.
11. **Ödüller (Rewards)** — star balance hero + progress to next threshold; **loyalty stamp cards**
    per cafe (X/9 stamps, redeem CTA when full → pick a free coffee from `/loyalty/coffees/:cafeId`);
    star history list (earn/redeem).
12. **Profil (Profile)** — user header (name, role, star badge); menu rows: Cüzdan, Favoriler,
    Kayıtlı İçecekler, Profili Düzenle (name/password), Çıkış Yap.
13. **Cüzdan (Wallet)** — balance card + quick top-up amounts + custom amount → `POST /wallet/topup`.
14. **Favoriler** — favorite products grid (toggle to remove).
15. **Kayıtlı İçecekler (Saved Drinks)** — saved custom recipes (name, base product, options, price),
    "Sepete Ekle" and delete.
16. **Harita (Map)** — cafes on a map (react-native-maps) using latitude/longitude, tappable pins →
    mini card → cafe detail. Campus-centered.

### Cafe Owner
17. **Panel (Dashboard)** — tabs:
    - **Aktif Siparişler**: live order cards (customer name+role, items, total, pickup time), actions
      "Hazır", "Teslim Et", "İptal" (per-item cancel with reason). New orders arrive via socket + toast.
    - **Geçmiş**: filterable (status, date) + paginated order history.
    - **Analiz**: today's revenue & order count KPIs; weekly bar chart; hourly distribution; top products;
      customer segments (by role). Use clean charts.
18. **Menü Yönetimi (Menu Management)** — tabs Ürünler & Kampanyalar. Product CRUD (name, category,
    price, description, image, availability toggle). Campaign CRUD (title, description, discount, badge,
    validity, target role, related products, active toggle).

## Quality bar
- Every list has loading skeleton + empty + error states.
- Optimistic favorite toggle; toasts on order placed, status change, stars earned, item cancelled.
- Reusable components: CafeCard, ProductCard, CampaignCard, OrderCard, StatusPill, StampCard,
  StarBadge, QuantityStepper, OptionSelector, PriceRow, SectionHeader, EmptyState, Toast.
- Feature-sliced structure: `features/<name>` for screens + hooks, `shared/` for ui/theme/api.

## BUILD ORDER (if generating in phases)
1. Design system + navigation + auth (Login/Register) + Home.
2. Explore/Menu + Cafe Detail + Product Detail + Search + Campaigns.
3. Cart + Orders/Tracking + Reviews + reorder.
4. Rewards + Wallet + Favorites + Saved Drinks + Map + Profile.
5. Cafe owner: Dashboard (active/history/analytics) + Menu Management.
