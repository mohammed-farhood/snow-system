# مصنع الثلج: the snow factory app

Live: **https://snow.t-plusplus.tech** (server: Mohammed #2).

## What it does, in one breath

Workers tap their name, type a 4-digit PIN, and sell: ice and goods on **one** receipt, cash, debt or part-paid.
They log how many blocks came out today. Anyone can take a payment against a customer's debt.
The owner sees the cash drawer, who owes what, stock, profit, and the partner's share.
Mistakes are undone from the log (workers: within 30 minutes; supervisors: same day; owner: any time).

## Who sees what

| | Worker | Supervisor | Owner |
|---|---|---|---|
| Sell, production, take debt payments | ✓ | ✓ | ✓ |
| Home shows | own cash in hand + stock | the day's drawer, debts, stock | same |
| Log shows | own entries | everyone's | everyone's |
| Expenses, purchases, suppliers, reports | | ✓ | ✓ |
| Prices, products, people & PINs, partner % | | | ✓ |

## How the numbers work

- **Ice stock** = blocks produced − wasted − blocks used by sales. Crushed ice uses part of a block
  (set per product in Settings → الأسعار; default 0.5).
- **Goods stock** = starting stock + bought − sold.
- **Debt** = unpaid part of sales − payments received. Same idea for what we owe suppliers.
- **Profit** = sales − cost of goods sold (average purchase price) − expenses.
- **Partner share** = partner % × ice sales (owner only; default 50%, set in Settings → المصنع).
- "Today" is Baghdad time.

## Deploy

```bash
bash deploy/deploy.sh            # ship changes, keep all data
bash deploy/deploy.sh --fresh    # WIPE and start empty: owner only, prints a new owner PIN
bash deploy/deploy.sh --demo     # WIPE and load two weeks of demo data, prints new PINs
```

Nightly database backup at 03:40 into `/srv/snow-data/backups` on the server (kept 30 days).

## Run it on this Mac

```bash
docker compose up -d                                   # database on port 5434
cd backend && cp .env.example .env && npm install
npx prisma migrate deploy && SEED_DEMO=1 npm run db:seed   # owner PIN 1234, staff PIN 1111
npm run dev                                            # API on :3001
cd ../frontend && npm install && npm run dev           # app on http://localhost:3002
node backend/scripts/smoke.mjs                         # quick end-to-end check of the API
```

## Code map

- `backend/` Express + Prisma (Postgres). Routes in `src/routes/`: `sales`, `entries` (production, expenses,
  payments, purchases), `today` (home numbers, log, undo), `people`, `reports`, `admin`.
- `frontend/` Next.js. One folder per screen in `src/app/`. Look and feel rules in `DESIGN.md`.
