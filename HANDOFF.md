# Snow Factory ERP — Session Handoff

## What This Project Is

A full-stack Arabic RTL ERP system for an ice factory in Iraq. Manages production, sales, purchases, expenses, reports, customers, and user accounts. All UI is in Arabic, right-to-left layout.

---

## How to Start Everything

### 1. Start the database (Docker)
Open Docker Desktop first, then:
```bash
cd "/Users/farhood/Desktop/codes/snow system"
docker compose up -d
```
Or if the container already exists:
```bash
docker start snow_factory_db
```

### 2. Start the backend
```bash
cd "/Users/farhood/Desktop/codes/snow system/backend"
npm run dev
```
Runs on **http://localhost:3001**

### 3. Start the frontend
```bash
cd "/Users/farhood/Desktop/codes/snow system/frontend"
npm run dev -- --port 3002
```
Runs on **http://localhost:3002**

---

## Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Owner (full access) |
| `supervisor1` | `pass123` | Supervisor |
| `worker1` | `pass123` | Worker |
| `worker2` | `pass123` | Worker |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router, React 18, Tailwind CSS, TypeScript |
| Backend | Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 via Docker (port 5434) |
| Auth | JWT stored in `localStorage` as `snow_factory_token` |
| Forms | react-hook-form + zod |
| Data fetching | @tanstack/react-query + axios |
| Charts | Recharts |
| Icons | Lucide React |

---

## Project Structure

```
snow system/
├── docker-compose.yml          # PostgreSQL container
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/page.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── snow/production/page.tsx
│       │   ├── snow/sales/page.tsx
│       │   ├── goods/page.tsx
│       │   ├── purchases/page.tsx
│       │   ├── expenses/page.tsx
│       │   ├── reports/page.tsx
│       │   ├── customers/page.tsx
│       │   └── settings/page.tsx
│       ├── components/
│       │   ├── layout/AppLayout.tsx   # Auth guard (checks token, shows loader)
│       │   ├── layout/Sidebar.tsx     # Navigation + logout button
│       │   └── ui/                    # Button, Input, Modal, Table, etc.
│       └── lib/
│           ├── auth.ts                # getToken, setToken, removeToken, isAuthenticated
│           └── api.ts                 # All API functions + axios interceptor
└── backend/
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts                    # Run with: npx prisma db seed
    └── src/
        ├── controllers/
        └── routes/
```

---

## Environment Variables

**Backend** (`backend/.env`):
```
DATABASE_URL="postgresql://snow_user:snow_pass@localhost:5434/snow_factory"
JWT_SECRET="snow-factory-super-secret-jwt-key-2024"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3002"
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Key Architecture Notes

### Auth flow
- Login stores JWT in `localStorage` as `snow_factory_token`
- `AppLayout` wraps every authenticated page — checks `isAuthenticated()` on mount, redirects to `/login` if not authenticated
- Axios response interceptor: on 401 with active session → clears token → `window.location.href = '/login'`
- After successful login, uses `window.location.replace("/dashboard")` (hard nav) NOT `router.replace` — this is intentional to avoid Next.js router state issues after a failed login attempt

### Role-based access
- `OWNER`: all pages including settings
- `SUPERVISOR`: all except settings
- `WORKER`: only production and sales pages

### API response envelope
Backend returns `{ success: true, data: {...} }`. The axios interceptor unwraps this automatically, so API functions receive `data` directly.

---

## Bugs Fixed in Previous Sessions

1. **Login redirect after wrong credentials** — changed `router.replace("/dashboard")` to `window.location.replace("/dashboard")` in `frontend/src/app/login/page.tsx`
2. **Login error message not showing** — backend returns `{ error: "..." }` not `{ message: "..." }`, fixed extraction in `onSubmit`
3. **Hydration mismatch** — added `suppressHydrationWarning` to login page footer (`{new Date().getFullYear()}`)

---

## Known Issues

1. **React hydration warning** — Recharts (used on dashboard and expenses pages) generates SVG IDs that differ between server and client render. Non-breaking, only visible in dev console. Proper fix: wrap `ResponsiveContainer` in a `ClientOnly` component (renders only after mount).

2. **Dashboard revenue chart never shows** — `revenueChart` is hardcoded to `[]` in `api.ts` `getDashboardStats()` because the backend doesn't return day-by-day chart data. The chart section is conditionally rendered only when `revenueChart.length > 0`, so it never appears.

---

## Visual Test Suite

A full Playwright test exists at `/tmp/snow-test/test.js`. Before running, pre-warm Next.js pages to avoid cold-compilation timeouts:

```bash
node /tmp/snow-test/prewarm.js   # triggers lazy page compilation (~2s each)
node /tmp/snow-test/test.js      # runs all 14 test steps
```

Screenshots are saved to `/tmp/snow-screenshots/`.

The test covers: login, wrong credentials error, dashboard + period buttons, production modal (7 inputs), sales, goods, purchases, expenses modal, reports, customers, settings, worker role view, and mobile viewport.

Last run result: **✅ All 14 steps passed — 0 bugs found**
