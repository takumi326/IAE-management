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

## Login (Supabase Auth)

- 認証は Supabase Auth (Google provider) を利用します。
- Web は Supabase で取得した access token を `Authorization: Bearer ...` として API に送信します。
- API は `SUPABASE_JWT_SECRET` で JWT を検証し、`ALLOWED_EMAILS` が設定されている場合は allowlist チェックを行います。
- ローカル開発では `development` 環境のため API 側認証をスキップします（開発速度優先）。

必要な環境変数:

```bash
# Web
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>

# API
SUPABASE_JWT_SECRET=<supabase-jwt-secret>
ALLOWED_EMAILS=foo@example.com,bar@example.com
```

## Production / CD

- 想定構成: Web=Vercel / API=Render / Auth=Supabase
- `main` への push で `.github/workflows/cd.yml` が実行され、API/Web の Docker イメージを GHCR (`ghcr.io/<owner>/<repo>`) に push します。
- デプロイを自動化する場合は、次の GitHub Secrets を設定してください。
  - `DEPLOY_HOST`
  - `DEPLOY_USER`
  - `DEPLOY_SSH_KEY`
  - `DEPLOY_PORT` (任意)
  - `DEPLOY_APP_DIR` (サーバー上で `docker compose` を実行するディレクトリ)
- API 本番では `ALLOWED_HOSTS` / `CORS_ORIGINS`（カンマ区切り）と `SUPABASE_JWT_SECRET` / `ALLOWED_EMAILS` を設定してください。
