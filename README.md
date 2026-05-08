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

## Login

- Google OAuth (`omniauth-google-oauth2`) を使ってログインします。
- 認証後は API のセッション (Cookie) でログイン状態を保持します。

最低限必要な環境変数:

```bash
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
WEB_APP_ORIGIN=http://localhost:5173
```

ログイン許可は `users` テーブルの email で制御します。  
初期ユーザーは seed で作成されます（デフォルト: `admin@example.com`）。

```bash
SEED_LOGIN_EMAILS=admin@example.com,foo@example.com
```

## Production / CD

- `main` への push で `.github/workflows/cd.yml` が実行され、API/Web の Docker イメージを GHCR (`ghcr.io/<owner>/<repo>`) に push します。
- デプロイを自動化する場合は、次の GitHub Secrets を設定してください。
  - `DEPLOY_HOST`
  - `DEPLOY_USER`
  - `DEPLOY_SSH_KEY`
  - `DEPLOY_PORT` (任意)
  - `DEPLOY_APP_DIR` (サーバー上で `docker compose` を実行するディレクトリ)
- API 本番では必要に応じて `ALLOWED_HOSTS` / `CORS_ORIGINS` を設定してください（カンマ区切り）。
