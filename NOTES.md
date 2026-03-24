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

## Run notes

- After cloning, run DB migrations from `qashio-api/`: `npm run migration:run`.
- **E2E:** With `DATABASE_URL` set, from `qashio-api/` run `npm run test:e2e` (runs in band). Includes `test/transaction-events.e2e-spec.ts` for emit + budget-listener behavior; the suite is skipped when `DATABASE_URL` is unset.
