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
- DB: `localhost:5432` (PostgreSQL 16)

Stop:

```bash
docker compose down
```

### Web: `node_modules` / Vite の import 解決

Web は `./web/node_modules` を bind マウント上に置き、起動時に `npm ci` で `package-lock.json` と揃えます。依存を変えたらコンテナを再起動すれば反映されます。

以前の `web_node_modules` 名前付きボリュームが残っている場合は `docker volume ls` で `*_web_node_modules` を削除してから `up` してください。

DB を作り直すときは `docker compose down -v` でボリュームを削除してから `docker compose up --build` してください。初回はテスト用 DB を作成してから ridgepole と seed:

```bash
docker compose run --rm api bash -lc "cd /app/api && RAILS_ENV=test bundle exec rails db:create"
docker compose run --rm api bash -lc "cd /app/api && bundle exec ridgepole -c config/database.yml -E development --apply -f db/Schemafile && bundle exec rails db:seed"
docker compose run --rm api bash -lc "cd /app/api && bundle exec ridgepole -c config/database.yml -E test --apply -f db/Schemafile"
```

`api_test` が無いエラーが出たら、上の `rails db:create` を実行するか、`docker compose down -v` でボリュームを消してから `up` し直してください（`docker/postgres-init` で `api_test` が作られます）。

## Login (Supabase Auth)

- 認証は Supabase Auth (Google provider) を利用します。
- Web は Supabase で取得した access token を `Authorization: Bearer ...` として API に送信します。
- API は Supabase の JWKS（公開鍵）で JWT を検証し、`ALLOWED_EMAILS` が設定されている場合は allowlist チェックを行います。
- ローカル開発では `development` 環境のため API 側認証をスキップします（開発速度優先）。

必要な環境変数:

```bash
# Web
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>

# API
SUPABASE_URL=https://<project-ref>.supabase.co
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
- API 本番では `ALLOWED_HOSTS` / `CORS_ORIGINS`（カンマ区切り）と `SUPABASE_URL` / `ALLOWED_EMAILS` を設定してください。
- Render Postgres の `DATABASE_URL` は `postgresql://...` 形式をそのまま使えます（Rails の `pg` アダプタ）。
