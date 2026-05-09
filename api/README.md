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

本番 Docker は起動時に Ridgepole を流します（`bin/docker-start`）。手動・Pre-Deploy 用に `bin/render-release` もあります（ルート README 参照）。
