## For the reviewer

- This submission repo is rooted at `full-stack-task/` (same level as `docker-compose.yml`), so the brief’s run command works as-is.

## Run (one command)

From `full-stack-task/`:

```bash
docker-compose up --build
```

Notes:
- The API container **auto-runs TypeORM migrations on startup** (so no extra manual steps are required).
- If you previously ran containers, `docker-compose down -v` will reset the DB volume.

## URLs

| Service | URL |
|--------|-----|
| Frontend | http://localhost:4000 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |

## What’s implemented (high level)

### Backend (NestJS + TypeORM)

- **Categories**: `POST /categories`, `GET /categories`
- **Transactions**: full CRUD `POST/GET/GET:id/PUT/DELETE /transactions` + list pagination/sort/filters
- **Budgets**: CRUD `POST/GET/GET:id/PUT/DELETE /budgets` + `GET /budgets/:id/usage` (spend vs cap)
- **Budget rule**: **no overlapping budgets** for the same category (409 Conflict with a clear message)
- **Docs**: Swagger at `/docs`

### Frontend (Next.js App Router + React Query + MUI)

- **Transactions list**: `/transactions` (DataGrid, pagination 10/page, sort + filters)
- **Transaction detail**: row click opens dialog with full details + edit/delete
- **Create transaction**: `/transactions/new`
- **Budgets page**: `/budgets` (CRUD + usage view)
- **Categories management**: `/categories` (table + add dialog)

## Environment

The canonical assignment text is **[README.md](./README.md)**.
- Docker Compose builds the frontend with `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` (so the browser can reach the API at the same host).
