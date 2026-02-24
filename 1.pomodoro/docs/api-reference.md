# API リファレンス

ポモドーロタイマーアプリケーションの REST API 仕様書。

---

## エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/` | メインページを返す |
| POST | `/api/sessions` | セッション完了を記録する |
| GET | `/api/sessions/today` | 今日の進捗統計を取得する |

---

## GET /

メインページ（`index.html`）を返す。

### レスポンス

- **ステータスコード**: `200 OK`
- **Content-Type**: `text/html; charset=utf-8`
- **ボディ**: Jinja2 テンプレートでレンダリングされた HTML

---

## POST /api/sessions

セッション完了を記録し、記録結果を返す。

### リクエスト

**Content-Type**: `application/json`

````json
{
  "duration_minutes": 25
}
````

#### パラメータ

| フィールド | 型 | 必須 | 説明 |
|----------|---|-----|------|
| `duration_minutes` | `int` | いいえ | セッションの長さ（分）。省略時は `25` |

#### バリデーション

- `duration_minutes` は正の整数である必要がある
- `0` 以下の値を指定すると `ValueError` が発生する

### レスポンス

**ステータスコード**: `201 Created`

**Content-Type**: `application/json`

````json
{
  "id": 1,
  "completed_at": "2026-02-24T10:30:00.123456"
}
````

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|----------|---|------|
| `id` | `int` | 記録されたセッションの一意識別子 |
| `completed_at` | `string` | セッション完了日時（ISO 8601 形式） |

### エラー

- **400 Bad Request**: リクエストボディが不正な JSON の場合
- **500 Internal Server Error**: サーバー内部エラー（例: `duration_minutes` が `0` 以下）

---

## GET /api/sessions/today

今日完了したセッションの統計情報を返す。

### リクエスト

パラメータなし。

### レスポンス

**ステータスコード**: `200 OK`

**Content-Type**: `application/json`

````json
{
  "completed_count": 4,
  "total_focus_minutes": 100
}
````

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|----------|---|------|
| `completed_count` | `int` | 今日完了したセッション数 |
| `total_focus_minutes` | `int` | 今日の累計集中時間（分） |

### 注意事項

- 「今日」は API サーバーのローカルタイムゾーンで判定される
- 日付が変わるとカウントはリセットされる（インメモリ実装のため、サーバー再起動でもリセット）

---

## エラーハンドリング

現在、API エンドポイントには統一的なエラーハンドリングが実装されていない。以下のような拡張が推奨される：

````python
@app.errorhandler(ValueError)
def handle_value_error(error):
    return jsonify({"error": str(error)}), 400

@app.errorhandler(404)
def handle_not_found(error):
    return jsonify({"error": "Not Found"}), 404
````

---

## 実装例

### セッション記録（JavaScript）

````javascript
async function recordSession(durationMinutes) {
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: durationMinutes })
    });

    if (!response.ok) {
      console.error('セッション記録に失敗しました:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('記録成功:', data);
    return data;
  } catch (error) {
    console.error('セッション記録エラー:', error);
    return null;
  }
}
````

### 今日の進捗取得（JavaScript）

````javascript
async function loadTodayStats() {
  try {
    const response = await fetch('/api/sessions/today');

    if (!response.ok) {
      console.error('進捗取得に失敗しました:', response.status);
      return;
    }

    const data = await response.json();
    console.log('完了セッション数:', data.completed_count);
    console.log('累計集中時間:', data.total_focus_minutes, '分');
  } catch (error) {
    console.error('進捗取得エラー:', error);
  }
}
````

---

## テスト用エンドポイント利用例（curl）

### セッション記録

````bash
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes": 25}'
````

### 今日の進捗取得

````bash
curl http://localhost:5000/api/sessions/today
````

---

## 今後の拡張案

- エラーレスポンスの統一（RFC 7807 Problem Details など）
- ページネーション対応（セッション履歴取得 API）
- 日付範囲指定での統計取得（例: `/api/sessions?from=2026-02-20&to=2026-02-24`）
- 認証・認可機構の追加（複数ユーザー対応）
- セッション削除 API（`DELETE /api/sessions/:id`）
