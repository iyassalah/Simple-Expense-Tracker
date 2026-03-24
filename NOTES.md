# Notes from the candidate

Requirements: [README.md](./README.md).

## For the reviewer

- Keep **one submission repo** rooted here (`full-stack-task/`), alongside `docker-compose.yml`, so the run command in the brief matches the layout.

## Features implemented

- Established backend infrastructure: database connectivity (TypeORM + PostgreSQL via `DATABASE_URL`), application-level validation and error handling, and API documentation scaffold at `/docs`.
- Categories API: `POST /categories` and `GET /categories` (unique category names, DTO validation, Swagger under `/docs`). Run DB migrations from `qashio-api/` with `npm run migration:run` after clone.
- Transactions API: `POST/GET/GET:id/PUT/DELETE /transactions` with category relation checks, validation, pagination/sort/filter on list, and Swagger docs under `/docs`.
- Budgets API: `POST/GET/GET:id/PUT/DELETE /budgets`, optional `GET /budgets?categoryId=…`, and `GET /budgets/:id/usage` for spend vs cap (expenses in period, optional `from`/`to` clamped to the budget window). New migration `CreateBudgetsTable`; run `npm run migration:run` from `qashio-api/`.
- **Transaction events (in-process):** `@nestjs/event-emitter` — after each successful create/update, `transaction.created` / `transaction.updated` fire with id, category, amount, type, dates. Listeners: structured logs (`TransactionActivityListener`) and async budget threshold warnings via `BudgetsService.warnIfBudgetsExceededAfterExpense` (`TransactionBudgetListener`). The README lists Kafka as a preferred streaming stack; this submission uses the Nest event emitter for scope and local reliability — Kafka can replace this layer later if needed.
- **Frontend foundation (Phase 7):** `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`); `lib/api-client.ts` + `lib/types/api.ts`; React Query defaults in `app/providers.tsx`. Nest **CORS** via `CORS_ORIGIN` / dev defaults (`qashio-api`).
- **Transactions list (Phase 8):** `/transactions` uses **MUI DataGrid** with **server** pagination (**10**/page), **sort**, and toolbar filters (**type**, **category**, **from/to** dates) against `GET /transactions`; category names joined from `GET /categories`; loading overlay, **“No transactions found”**, and **MUI `Alert`** on errors. API helper: `lib/api/transactions.ts`.

## Environment & URLs (implementation)

The canonical assignment text is **[README.md](./README.md)** — this section is for running the implemented stack.

### Backend (`qashio-api`)

- **`DATABASE_URL`** — PostgreSQL (required). Migrations: `npm run migration:run` from `qashio-api/`.
- **`PORT`** — API port (default `3000`).
- **`CORS_ORIGIN`** — Comma-separated browser origins. If unset in development, Nest defaults in `main.ts` allow common localhost ports. **Docker Compose** sets `CORS_ORIGIN=http://localhost:4000` for the mapped frontend.

### Frontend (`qashio-frontend-assignment`)

- **`NEXT_PUBLIC_API_BASE_URL`** — Nest API base URL, no trailing slash (e.g. `http://localhost:3000`). Copy `.env.example` to `.env.local` for `next dev`. In development, if unset, the app falls back to `http://localhost:3000` with a console warning. Docker build uses `NEXT_PUBLIC_API_BASE_URL` from `docker-compose.yml` build `args`.

### Default Docker Compose port mappings

| Service    | URL |
|------------|-----|
| Frontend   | http://localhost:4000 |
| API        | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |

## Run notes

- After cloning, run DB migrations from `qashio-api/`: `npm run migration:run`.
