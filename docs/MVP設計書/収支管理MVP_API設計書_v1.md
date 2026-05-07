# 収支管理アプリ API設計書 v1

作成日: 2026-05-07
オーナー: ふりすく
関連ドキュメント: 収支管理MVP_DBスキーマ設計書_v3.md / 収支管理MVP_UI設計書_v2.md / 収支管理MVP_インフラ設計書_v2.md

---

## 1. 前提

- Backend: Rails API
- 認証: Supabase Auth JWT (Authorization: Bearer)
- データ形式: JSON
- 日付: `YYYY-MM-01` (年月は月初日で表現)
- 金額: 整数円 (`numeric(15,0)`)
- 画面表示は絶対値、API保存は符号付き
  - 収入: 正
  - 支出: 負

---

## 2. 共通仕様

### 2.1 Base URL

`/api`

### 2.2 共通レスポンス形式

成功:
```json
{
  "data": {}
}
```

失敗:
```json
{
  "error": {
    "code": "validation_error",
    "message": "金額は1以上を入力してください",
    "details": {
      "amount": ["must be greater than 0"]
    }
  }
}
```

### 2.3 ステータスコード

- `200` 取得/更新成功
- `201` 作成成功
- `204` 削除成功
- `400` リクエスト不正
- `401` 認証エラー
- `404` リソース未存在
- `422` バリデーションエラー
- `500` サーバーエラー

---

## 3. 認証

### 3.1 認証ヘッダ

`Authorization: Bearer <supabase_jwt>`

### 3.2 認証チェック

- JWT検証失敗: `401 unauthorized`
- allowlist不一致: `401 unauthorized`

---

## 4. ダッシュボード

### 4.1 GET `/api/dashboard?year_month=2026-05-01`

用途:
- ダッシュボード初期表示の一括取得
- 予想残高、今月サマリ、今年度サマリ、カテゴリ別実績、今月月末残高を返す

レスポンス例:
```json
{
  "data": {
    "target_month": "2026-05-01",
    "monthly_summary": {
      "forecast_income": 350000,
      "forecast_expense": -200000,
      "actual_income": 320000,
      "actual_expense": -180000,
      "forecast_balance": 2345678,
      "balance_status": "forecast"
    },
    "fiscal_year_summary": [
      {
        "year_month": "2026-04-01",
        "forecast_income": 350000,
        "forecast_expense": -200000,
        "actual_income": 340000,
        "actual_expense": -190000,
        "month_end_balance": 2220000,
        "status": "actual"
      }
    ],
    "category_actuals": {
      "expense": [
        {"category_id": 1, "large": "ソシャゲ", "small": "すたれ", "amount": -20000},
        {"category_id": 5, "large": "食費", "small": null, "amount": -45000}
      ],
      "income": [
        {"category_id": 7, "large": "給与", "small": null, "amount": 320000}
      ]
    },
    "monthly_balance_input": {
      "year_month": "2026-05-01",
      "amount": null
    }
  }
}
```

---

## 5. 予想 (forecasts)

### 5.1 GET `/api/forecasts?year_month=2026-05-01`

レスポンス:
```json
{
  "data": [
    {"id": 1, "year_month": "2026-05-01", "kind": "income", "amount": 350000},
    {"id": 2, "year_month": "2026-05-01", "kind": "expense", "amount": -200000}
  ]
}
```

### 5.2 PATCH `/api/forecasts/:id`

リクエスト:
```json
{
  "amount": -210000
}
```

レスポンス:
```json
{
  "data": {"id": 2, "year_month": "2026-05-01", "kind": "expense", "amount": -210000}
}
```

### 5.3 POST `/api/forecasts/bulk_update`

用途:
- 「今月以降を一括編集」

リクエスト:
```json
{
  "start_month": "2026-06-01",
  "kind": "expense",
  "mode": "set",
  "amount": -220000
}
```

`mode`:
- `set`: 指定金額で上書き
- `delta`: 既存金額に加算

レスポンス:
```json
{
  "data": {
    "updated_count": 10
  }
}
```

---

## 6. 実績 (actuals)

### 6.1 GET `/api/actuals?year_month=2026-05-01&kind=expense`

レスポンス:
```json
{
  "data": [
    {
      "actual_id": 100,
      "year_month": "2026-05-01",
      "amount": -3500,
      "kind": "expense",
      "master_id": 21,
      "category": {"large": "食費", "small": null},
      "payment_method": {"id": 1, "name": "PayPayカード"}
    }
  ]
}
```

### 6.2 POST `/api/actuals`

用途:
- 実績作成 + 中間テーブル自動作成

リクエスト:
```json
{
  "year_month": "2026-05-01",
  "kind": "expense",
  "master_id": 21,
  "amount": 3500
}
```

サーバー動作:
- `kind=expense` -> `actuals.amount=-3500`
- `expense_actuals` に紐付け作成

レスポンス:
```json
{
  "data": {
    "actual_id": 100,
    "year_month": "2026-05-01",
    "amount": -3500,
    "kind": "expense",
    "master_id": 21
  }
}
```

### 6.3 PATCH `/api/actuals/:id`

リクエスト:
```json
{
  "year_month": "2026-05-01",
  "amount": 5000,
  "master_id": 21
}
```

レスポンス:
```json
{
  "data": {
    "actual_id": 100,
    "year_month": "2026-05-01",
    "amount": -5000,
    "kind": "expense",
    "master_id": 21
  }
}
```

### 6.4 DELETE `/api/actuals/:id`

レスポンス: `204 No Content`

### 6.5 POST `/api/actuals/import`

リクエスト:
```json
{
  "rows": [
    {"year_month": "2026-05-01", "kind": "expense", "master_id": 21, "amount": 3500},
    {"year_month": "2026-05-01", "kind": "income", "master_id": 11, "amount": 320000}
  ]
}
```

レスポンス:
```json
{
  "data": {
    "imported": 2,
    "failed": 0,
    "errors": []
  }
}
```

---

## 7. カテゴリ (categories)

### 7.1 GET `/api/categories?kind=expense`

### 7.2 POST `/api/categories`

リクエスト:
```json
{
  "large_name": "ソシャゲ",
  "small_name": "ゼンゼロ",
  "kind": "expense"
}
```

### 7.3 PATCH `/api/categories/:id`

### 7.4 DELETE `/api/categories/:id`

削除時ルール:
- 紐付く `expenses/incomes` がある場合は `422`

---

## 8. 支払方法 (payment_methods)

### 8.1 GET `/api/payment_methods`

### 8.2 POST `/api/payment_methods`

リクエスト:
```json
{
  "name": "PayPayカード",
  "method_type": "card"
}
```

### 8.3 PATCH `/api/payment_methods/:id`

### 8.4 DELETE `/api/payment_methods/:id`

削除時ルール:
- 紐付く `expenses` がある場合は `422`

---

## 9. 支出マスタ (expenses)

### 9.1 GET `/api/expenses?active_only=true`

### 9.2 POST `/api/expenses`

リクエスト:
```json
{
  "category_id": 1,
  "payment_method_id": 2,
  "end_month": null
}
```

### 9.3 PATCH `/api/expenses/:id`

リクエスト例 (今月停止):
```json
{
  "end_month": "2026-05-01"
}
```

### 9.4 DELETE `/api/expenses/:id`

---

## 10. 収入マスタ (incomes)

### 10.1 GET `/api/incomes`

### 10.2 POST `/api/incomes`

リクエスト:
```json
{
  "category_id": 7,
  "deposit_month": "2026-05-01",
  "is_recurring": true
}
```

### 10.3 PATCH `/api/incomes/:id`

### 10.4 DELETE `/api/incomes/:id`

---

## 11. 月末残高 (monthly_balances)

### 11.1 GET `/api/monthly_balances?year_month=2026-05-01`

レスポンス:
```json
{
  "data": {
    "id": 1,
    "year_month": "2026-05-01",
    "amount": 2345678
  }
}
```

### 11.2 PUT `/api/monthly_balances`

リクエスト:
```json
{
  "year_month": "2026-05-01",
  "amount": 2345678
}
```

レスポンス:
```json
{
  "data": {
    "id": 1,
    "year_month": "2026-05-01",
    "amount": 2345678
  }
}
```

---

## 12. バッチAPI

### 12.1 POST `/api/forecasts/generate_fiscal_year`

用途:
- 年度初めに12ヶ月分の予想を作成

リクエスト:
```json
{
  "fiscal_year_start": "2026-04-01"
}
```

レスポンス:
```json
{
  "data": {
    "created": 24
  }
}
```

---

## 13. バリデーション要件

- `year_month` は必ず月初日 (`YYYY-MM-01`)
- `kind` は `income` / `expense`
- `forecasts.amount`
  - `kind=income` なら正
  - `kind=expense` なら負
- `actuals` 作成時は入力額を正で受け、保存時に符号変換
- `actuals` は必ず支出か収入どちらか1つに紐付く
- `monthly_balances.amount` は0以上

---

## 14. 実装順の推奨

1. マスタ系API (`categories`, `payment_methods`, `expenses`, `incomes`)
2. `monthly_balances`
3. `forecasts` (単体更新 + 一括更新)
4. `actuals` (作成/編集/削除 + import)
5. `dashboard` 集約API
6. `generate_fiscal_year` バッチAPI

---

## 15. 変更履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| v1 | 2026-05-07 | 初版作成。DB v3 / UI v2 に対応 |
