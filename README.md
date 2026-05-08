# IAE-management
収支管理アプリ

## Project Structure

- `ignore/`: planning/design source docs (not tracked in git)
- `docs/`: consolidated decisions for implementation
- `api/`: Rails API (to be implemented)
- `web/`: React + TypeScript frontend (to be implemented)

## Current Status

- Design docs were prepared first.
- Initial implementation decisions and task breakdown are documented in `docs/`.

## Docker Development

Start all services:

```bash
docker compose up --build
```

Endpoints:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- DB: `localhost:3306` (MySQL 8)

Stop:

```bash
docker compose down
```

PostgreSQL から移行した場合や DB を作り直すときは `docker compose down -v` でボリュームを削除してから `docker compose up --build` してください。初回スキーマ適用とシード:

```bash
docker compose run --rm api bash -lc "cd /app/api && bundle exec ridgepole -c config/database.yml -E development --apply -f db/Schemafile && bundle exec rails db:seed"
```
