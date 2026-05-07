# API

Rails API for IAE management MVP.

## Database (Ridgepole)

Schema is defined in `api/Schemafile`.

Apply schema:

```bash
bundle exec ridgepole -c config/database.yml -E development --apply -f Schemafile
```

Export current DB schema back to Schemafile:

```bash
bundle exec ridgepole -c config/database.yml -E development --export -f Schemafile
```
