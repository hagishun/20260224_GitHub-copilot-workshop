# ユニットテスト生成

## コンテキスト

ポモドーロタイマーアプリケーションのユニットテストを生成する。

## 指示

指定されたソースファイルに対して、以下の方針でユニットテストを生成してください。

### Python テスト（pytest）

- `1.pomodoro/tests/` ディレクトリに配置する
- テストファイル名は `test_<モジュール名>.py` とする
- テスト関数名は `test_<メソッド名>_<条件>_<期待結果>` の形式
- サービス層テストではモックリポジトリを注入する
- API テストでは `create_app(TestConfig)` + `app.test_client()` を使用する
- フィクスチャは `conftest.py` に定義する

```python
# テスト関数の命名例
def test_complete_session_with_valid_duration_returns_session_id():
    ...

def test_get_today_stats_with_no_sessions_returns_zero():
    ...
```

### JavaScript テスト（Jest）

- `1.pomodoro/static/js/tests/` ディレクトリに配置する
- テストファイル名は `<モジュール名>.test.js` とする
- ES Modules の `import` を使用する
- `describe` / `it` でグルーピングする
- エッジケース（0秒、負の値、境界値）をカバーする

```javascript
import { formatTime } from '../timer.js';

describe('formatTime', () => {
  it('should format 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });
});
```

### 共通方針

- 正常系・異常系・境界値をカバーする
- テストは独立して実行可能にする（テスト間の依存なし）
- Arrange-Act-Assert パターンを使う
