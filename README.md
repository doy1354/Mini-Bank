## Mini Banking Platform

### Stack

- **Backend**: Node.js + NestJS (REST API) + PostgreSQL
- **Auth**: JWT (Bearer token)
- **Frontend**: Next.js (App Router) + Tailwind + Zustand
- **Money precision**: **integer cents** (`bigint`) end-to-end
- **Ledger integrity**: **double-entry ledger** + DB-level balancing constraint trigger

### Database (PostgreSQL)

Create a database (example):

```sql
CREATE DATABASE mini_bank;
```

### Backend: run

1. In `backend/`, set environment variables (example values in `backend/env.example`).
2. Run migrations + seed:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

3. Start API:

```bash
cd backend
npm run start:dev
```

Backend listens on `PORT` (default **3001**).
Swagger UI is available at `/docs`.

### Seeded users (default)

- `maria@test.com` / `Password123!`
- `hassan@test.com` / `Password123!`
- `lina@test.com` / `Password123!`

Each user has:

- USD account: **$1000.00**
- EUR account: **€500.00**

### Frontend: run

Set `NEXT_PUBLIC_API_URL` to your backend URL (example: `http://localhost:3001`).

```bash
cd frontend
npm run dev
```

Open the app and login via `/login`, then use `/dashboard` and `/transactions`.

### API summary

Auth:

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`

Accounts:

- `GET /accounts`
- `GET /accounts/:id/balance`
- `GET /accounts/reconcile` (verify `accounts.balance_cents` vs ledger sum)

Transactions:

- `POST /transactions/transfer` (same currency between users)
- `POST /transactions/exchange` (fixed rate: **1 USD = 0.92 EUR**)
- `GET /transactions?type=transfer|exchange&page=&limit=`
- `GET /transactions/:id` (transaction receipt/details + ledger entries)

Docs:

- `GET /docs` (Swagger UI)

Realtime:

- Socket.IO server on the backend emits `balances.updated` after transfer/exchange

### Double-entry + consistency guarantees

- **Ledger entries** (`ledger_entries`) are the audit trail.
- Each transaction writes signed entries that balance **per currency** (enforced by a **deferrable DB constraint trigger**).
- `accounts.balance_cents` is updated by a DB trigger on ledger inserts/deletes, ensuring **balances stay synchronized**.
- Insufficient funds is prevented at the DB level (negative balances are rejected).

### Tests (backend)

```bash
cd backend
npm test
```

### Docker

Run the full stack with Postgres + backend + frontend:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`
