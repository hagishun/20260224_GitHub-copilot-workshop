# Flask エンドポイント作成

## コンテキスト

ポモドーロタイマーアプリケーションに新しい API エンドポイントを追加する。

## 指示

以下のアーキテクチャに従って、新しい Flask エンドポイントを作成してください。

### レイヤー構成

1. **Route（app.py）**: ルーティングのみ。ビジネスロジックは書かない
2. **Service（services/）**: Flask 非依存の純粋なビジネスロジック。DI でリポジトリを受け取る
3. **Repository（repositories/）**: データ永続化の抽象化
4. **Model（models/）**: `@dataclass` によるデータ構造

### 実装手順

1. 必要であれば Model を定義する
2. Repository にデータアクセスメソッドを追加する
3. Service にビジネスロジックを実装する
4. app.py にルートを追加する（Service を呼び出すのみ）
5. テストを作成する（Repository → Service → API の順）

### コード規約

- 型ヒントを必ず付与する
- Google スタイルの docstring を書く
- レスポンスは JSON 形式で返す
- エラーレスポンスには適切な HTTP ステータスコードを使用する

### テンプレート

```python
# app.py にルートを追加
@app.route('/api/<resource>', methods=['POST'])
def create_resource():
    """リソースを作成する。"""
    data = request.get_json()
    result = app.service.method_name(data['field'])
    return jsonify(result), 201
```

### API 仕様

既存の API 仕様（architecture.md）に準拠する：
- `POST /api/sessions` — セッション完了を記録（201）
- `GET /api/sessions/today` — 今日の進捗を返す（200）
