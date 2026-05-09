# API

Rails API for IAE management MVP.

## Database (Ridgepole)

Schema is defined in `api/db/Schemafile`.

Apply schema:

```bash
bundle exec ridgepole -c config/database.yml -E development --apply -f db/Schemafile
```

Export current DB schema back to Schemafile:

```bash
bundle exec ridgepole -c config/database.yml -E development --export -f db/Schemafile
```

## Production (Render など)

`DATABASE_URL` を設定したうえで、本番にも Schemafile を適用します。

```bash
bundle exec ridgepole -c config/database.yml -E production --apply -f db/Schemafile
```

Render の **Pre-Deploy Command** 用に `bin/render-release` があります（ルート README の「Render: DB スキーマ」を参照）。

本番の **`rails db:seed`** はデプロイに含めていません。初回のみ Shell で実行してください（再実行で予測などが上書きされる可能性あり）。
