# データモデル仕様

ポモドーロタイマーアプリケーションで使用されるデータモデルの仕様。

---

## Session モデル

ポモドーロセッションのデータ構造を表現する。

### 定義

`models/session.py` で `@dataclass` として定義される。

````python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Session:
    """ポモドーロセッションのデータ構造。
    
    Attributes:
        id: セッションの一意識別子。
        duration_minutes: セッションの長さ（分）。
        completed_at: セッション完了日時。
    """
    id: int
    duration_minutes: int
    completed_at: datetime
````

### フィールド詳細

| フィールド | 型 | 説明 | 制約 |
|----------|---|------|------|
| `id` | `int` | セッションの一意識別子 | 正の整数。リポジトリが自動採番する |
| `duration_minutes` | `int` | セッションの長さ（分） | 正の整数。通常は 25（作業）、5（短い休憩）、15（長い休憩） |
| `completed_at` | `datetime` | セッション完了日時 | Python の `datetime` オブジェクト |

### データフロー

1. **作成時**: サービス層で `Session(id=0, duration_minutes=25, completed_at=datetime.now())` として生成
2. **保存時**: リポジトリが `id` を自動採番して永続化
3. **検索時**: リポジトリが日付でフィルタリングして返す
4. **API レスポンス時**: サービス層が辞書形式に変換（`completed_at` は ISO 8601 形式の文字列に変換）

### 使用例

````python
from datetime import datetime
from models.session import Session

# セッションの作成
session = Session(
    id=0,
    duration_minutes=25,
    completed_at=datetime.now()
)

# リポジトリに保存
saved_session = repository.save(session)
print(saved_session.id)  # 1（自動採番）

# API レスポンス用に辞書変換
response_data = {
    "id": saved_session.id,
    "completed_at": saved_session.completed_at.isoformat(),
}
````

---

## API レスポンス形式

### POST /api/sessions のレスポンス

````json
{
  "id": 1,
  "completed_at": "2026-02-24T10:30:00.123456"
}
````

| フィールド | 型 | 説明 |
|----------|---|------|
| `id` | `int` | セッション ID |
| `completed_at` | `string` | ISO 8601 形式の日時文字列 |

### GET /api/sessions/today のレスポンス

````json
{
  "completed_count": 4,
  "total_focus_minutes": 100
}
````

| フィールド | 型 | 説明 |
|----------|---|------|
| `completed_count` | `int` | 今日完了したセッション数 |
| `total_focus_minutes` | `int` | 今日の累計集中時間（分） |

---

## リポジトリの内部データ構造

`SessionRepository` はインメモリで以下のデータを保持する。

````python
class SessionRepository:
    def __init__(self) -> None:
        self._sessions: list[Session] = []  # セッションのリスト
        self._next_id: int = 1              # 次に採番する ID
````

### 保存時の挙動

````python
def save(self, session: Session) -> Session:
    session.id = self._next_id  # ID を自動採番
    self._next_id += 1
    self._sessions.append(session)
    return session
````

### 検索時の挙動

````python
def find_by_date(self, date: str) -> list[Session]:
    """指定日付のセッションを検索する（YYYY-MM-DD 形式）。"""
    return [
        s for s in self._sessions
        if s.completed_at.strftime("%Y-%m-%d") == date
    ]
````

---

## 設定モデル

アプリケーション設定は `config.py` で定義される。

### Config クラス

````python
class Config:
    """本番用設定。"""
    DEBUG: bool = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
    WORK_DURATION: int = 25 * 60  # 秒
    SHORT_BREAK_DURATION: int = 5 * 60
    LONG_BREAK_DURATION: int = 15 * 60
    SESSIONS_BEFORE_LONG_BREAK: int = 4
````

### TestConfig クラス

````python
class TestConfig(Config):
    """テスト用設定（短い時間でテスト可能）。"""
    WORK_DURATION: int = 3  # 秒
    SHORT_BREAK_DURATION: int = 1
    LONG_BREAK_DURATION: int = 2
    SESSIONS_BEFORE_LONG_BREAK: int = 4
````

### 設定フィールド

| フィールド | 型 | 説明 | デフォルト値（本番） |
|----------|---|------|------------------|
| `DEBUG` | `bool` | Flask デバッグモード | `False` |
| `WORK_DURATION` | `int` | 作業時間（秒） | `1500`（25分） |
| `SHORT_BREAK_DURATION` | `int` | 短い休憩時間（秒） | `300`（5分） |
| `LONG_BREAK_DURATION` | `int` | 長い休憩時間（秒） | `900`（15分） |
| `SESSIONS_BEFORE_LONG_BREAK` | `int` | 長い休憩までのセッション数 | `4` |

---

## フロントエンド状態モデル

JavaScript の `ui.js` では以下の状態を管理する。

````javascript
// タイマー状態
let currentState = STATES.IDLE;           // 現在の状態
let remaining = DURATIONS.WORK;           // 残り時間（秒）
let totalDuration = DURATIONS.WORK;       // 現在フェーズの合計時間
let sessionCount = 0;                     // 完了した作業セッション数
let intervalId = null;                    // setInterval の ID
let isPaused = false;                     // 一時停止中フラグ
````

### 状態定数（STATES）

````javascript
export const STATES = {
  IDLE: 'IDLE',
  WORKING: 'WORKING',
  SHORT_BREAK: 'SHORT_BREAK',
  LONG_BREAK: 'LONG_BREAK'
};
````

### 時間定数（DURATIONS）

````javascript
export const DURATIONS = {
  WORK: 25 * 60,                     // 1500 秒
  SHORT_BREAK: 5 * 60,               // 300 秒
  LONG_BREAK: 15 * 60,               // 900 秒
  SESSIONS_BEFORE_LONG_BREAK: 4
};
````

---

## データ変換

### Python → JSON（API レスポンス）

サービス層で `Session` オブジェクトを辞書に変換する。

````python
def complete_session(self, duration_minutes: int) -> dict:
    session = Session(id=0, duration_minutes=duration_minutes, completed_at=datetime.now())
    saved = self.repository.save(session)
    
    return {
        "id": saved.id,
        "completed_at": saved.completed_at.isoformat(),  # datetime → ISO 8601 文字列
    }
````

### JSON → JavaScript（フロントエンド）

````javascript
const response = await fetch('/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ duration_minutes: 25 })
});

const data = await response.json();
// data = { "id": 1, "completed_at": "2026-02-24T10:30:00.123456" }
````

---

## データライフサイクル

### セッション記録の流れ

1. フロントエンド: 作業セッション完了時に `POST /api/sessions` を呼び出す
2. ルート層（`app.py`）: リクエストを受け取り、サービス層に委譲
3. サービス層（`pomodoro_service.py`）: `Session` オブジェクトを生成し、リポジトリに保存依頼
4. リポジトリ層（`session_repository.py`）: ID を自動採番してインメモリリストに追加
5. サービス層: 保存結果を辞書形式に変換して返す
6. ルート層: JSON レスポンスとして返す（201 Created）
7. フロントエンド: レスポンスを受け取り、履歴に追加

### 統計取得の流れ

1. フロントエンド: ページロード時に `GET /api/sessions/today` を呼び出す
2. ルート層: リクエストを受け取り、サービス層に委譲
3. サービス層: 今日の日付でリポジトリに検索依頼
4. リポジトリ層: `completed_at` の日付でフィルタリングして返す
5. サービス層: セッション数と累計時間を集計して辞書形式で返す
6. ルート層: JSON レスポンスとして返す（200 OK）
7. フロントエンド: レスポンスを受け取り、UI に表示

---

## 今後の拡張案

### Session モデルの拡張

````python
@dataclass
class Session:
    id: int
    user_id: int | None              # 複数ユーザー対応
    duration_minutes: int
    session_type: str                # "WORK" | "SHORT_BREAK" | "LONG_BREAK"
    completed_at: datetime
    tags: list[str] | None           # セッションにタグ付け（例: "勉強", "仕事"）
    note: str | None                 # メモ
````

### 統計モデルの追加

````python
@dataclass
class DailyStats:
    date: str
    completed_count: int
    total_focus_minutes: int
    average_focus_minutes: float
    longest_streak: int
````

### 目標モデルの追加

````python
@dataclass
class Goal:
    id: int
    user_id: int
    target_sessions_per_day: int
    target_focus_minutes_per_day: int
    created_at: datetime
````
