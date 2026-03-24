# Notes from the candidate

Requirements: [README.md](./README.md).

## For the reviewer

- Keep **one submission repo** rooted here (`full-stack-task/`), alongside `docker-compose.yml`, so the run command in the brief matches the layout.

## Features implemented

- Established backend infrastructure: database connectivity (TypeORM + PostgreSQL via `DATABASE_URL`), application-level validation and error handling, and API documentation scaffold at `/docs`.
- Categories API: `POST /categories` and `GET /categories` (unique category names, DTO validation, Swagger under `/docs`). Run DB migrations from `qashio-api/` with `npm run migration:run` after clone.
- Transactions API: `POST/GET/GET:id/PUT/DELETE /transactions` with category relation checks, validation, pagination/sort/filter on list, and Swagger docs under `/docs`.
- Budgets API: `POST/GET/GET:id/PUT/DELETE /budgets`, optional `GET /budgets?categoryId=…`, and `GET /budgets/:id/usage` for spend vs cap (expenses in period, optional `from`/`to` clamped to the budget window). New migration `CreateBudgetsTable`; run `npm run migration:run` from `qashio-api/`.

## Run notes

- After cloning, run DB migrations from `qashio-api/`: `npm run migration:run`.
