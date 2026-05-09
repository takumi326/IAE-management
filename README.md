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

DBeaver などでローカル DB を見るときは、デフォルトのデータベース名 **`iae_management_development`**（ユーザー `postgres` / パスワード `postgres`）を開いてください。`postgres` という名前の管理用 DB だけを見ているとテーブルが空に見えます。

### 初回・DB 作り直し後（Docker）

次で development に Ridgepole を当て、`db:seed` まで実行します（`api_test` 用の Ridgepole も続けて実行）。

```bash
chmod +x scripts/docker-db-bootstrap.sh   # 初回のみ
./scripts/docker-db-bootstrap.sh
```

手動で行う場合は従来どおり `docker compose run --rm api bash -lc "cd /app/api && ..."`（このファイルの「DB を作り直すとき」節）でも構いません。

Stop:

```bash
docker compose down
```

### Web: `node_modules` / Vite の import 解決

Web は `./web/node_modules` を bind マウント上に置き、起動時に `npm ci` で `package-lock.json` と揃えます。依存を変えたら **Web コンテナを再起動**（または `down` → `up`）すれば反映されます。

`Failed to resolve import "@supabase/supabase-js"` が **変わらない**ときは、まず **リポジトリを最新にしてから** 次を順に試してください。

```bash
git pull origin main
docker compose down
docker volume ls | grep web_node_modules   # 残っていれば削除（例: iae-management_web_node_modules）
docker volume rm <上で見つかった名前>
docker compose up --build -d
```

古い compose で名前付きボリューム `web_node_modules` を使っていた環境では、そのボリュームだけが残っているとコンテナ内とホストの `node_modules` がずれることがあります。`docker volume rm` で捨ててから `up` してください。

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

### Render: DB スキーマ（Ridgepole）

スキーマは **`rails db:migrate` ではなく** `api/db/Schemafile` を **Ridgepole** で本番 DB に適用します。未適用だと Postgres ログに `relation "forecasts" does not exist` のように出ます。

**いまの本番 DB を直す（手動・一度）**

1. Render の **API サービス → Shell**（イメージ内のカレントディレクトリは `/app/api`）
2. 次を実行:

```bash
bundle exec ridgepole -c config/database.yml -E production --apply -f db/Schemafile
```

**以降のデプロイで自動適用**

Render ダッシュボードの **Pre-Deploy Command**（旧称 Release Command に相当）に次を設定します（`DATABASE_URL` が API にリンク済みであること）。

```bash
bash bin/render-release
```

スクリプトは `api/bin/render-release` です。Blueprint（`render.yaml`）を使う場合はフィールド名は **`preDeployCommand`** です。雛形は `docs/render-blueprint.example.yaml` を参照してください。

**本番の seed について**

`rails db:seed` は **デプロイでは自動実行されません**（意図的）。初回だけマスタやサンプル予測を入れたいときは、上記 Shell で **一度だけ**:

```bash
bundle exec rails db:seed
```

※ seed は予測などを `find_or_initialize_by` で上書きする行があるため、本番で何度も流すとデータが意図せず戻る可能性があります。運用データが入ったあとは seed は使わない想定です。
