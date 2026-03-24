# Notes from the candidate

Requirements: [README.md](./README.md).

## For the reviewer

- Keep **one submission repo** rooted here (`full-stack-task/`), alongside `docker-compose.yml`, so the run command in the brief matches the layout.

## Features implemented

- Established backend infrastructure: database connectivity (TypeORM + PostgreSQL via `DATABASE_URL`), application-level validation and error handling, and API documentation scaffold at `/docs`.
- Categories API: `POST /categories` and `GET /categories` (unique category names, DTO validation, Swagger under `/docs`). Run DB migrations from `qashio-api/` with `npm run migration:run` after clone.

## Run notes

- After cloning, run DB migrations from `qashio-api/`: `npm run migration:run`.
