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
