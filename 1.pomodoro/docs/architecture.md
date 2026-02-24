# アーキテクチャドキュメント

ポモドーロタイマーアプリケーションの現在の実装アーキテクチャを解説する。

---

## 概要

Flask + HTML/CSS/JavaScript で構築されたポモドーロタイマー Web アプリケーション。テスタビリティと保守性を重視したレイヤードアーキテクチャを採用している。

---

## ディレクトリ構成

````
1.pomodoro/
├── app.py                          # Flask アプリファクトリ + ルーティング
├── config.py                       # 設定（本番用 / テスト用）
├── models/
│   ├── __init__.py
│   └── session.py                  # Session データクラス
├── services/
│   ├── __init__.py
│   └── pomodoro_service.py         # ビジネスロジック（Flask 非依存）
├── repositories/
│   ├── __init__.py
│   └── session_repository.py       # データ永続化の抽象化
├── templates/
│   └── index.html                  # メインページ（Jinja2 テンプレート）
├── static/
│   ├── css/
│   │   └── style.css               # スタイル（紫グラデ、カード、SVG等）
│   └── js/
│       ├── timer.js                # タイマーロジック（純粋関数、DOM 非依存）
│       ├── ui.js                   # DOM 操作（timer.js から分離）
│       └── tests/
│           └── timer.test.js       # JS ユニットテスト（Jest）
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 # pytest fixtures
│   ├── test_pomodoro_service.py    # サービス層テスト
│   ├── test_session_repository.py  # リポジトリ層テスト
│   └── test_app.py                 # API 統合テスト（Flask test_client）
├── requirements.txt                # Python 依存パッケージ
├── package.json                    # Node.js 依存（Jest テスト用）
├── Makefile                        # 統一テスト実行コマンド
├── architecture.md                 # 設計ドキュメント
├── features.md                     # 機能仕様書
└── docs/                           # 実装ドキュメント
    ├── api-reference.md
    ├── architecture.md（本ドキュメント）
    ├── data-models.md
    └── frontend.md
````

---

## アーキテクチャ全体像

````
┌─────────────────────────────────────────────────┐
│                  フロントエンド                    │
│  index.html + style.css + ui.js + timer.js      │
│                                                   │
│  ui.js ──呼出──▶ timer.js（純粋関数）             │
│    │                                              │
│    └──── fetch ──▶ Flask API                      │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│                  バックエンド                      │
│                                                   │
│  app.py (Routes)                                  │
│    │                                              │
│    ▼                                              │
│  PomodoroService (Business Logic)                 │
│    │                                              │
│    ▼                                              │
│  SessionRepository (Data Access)                  │
└─────────────────────────────────────────────────┘
````

---

## レイヤー設計

### 1. Routes（app.py）

Flask のルーティングのみを担当する。ビジネスロジックは書かない。

#### 実装詳細

- **アプリファクトリパターン**: `create_app(config=None)` でアプリを生成
- テストごとに独立したアプリインスタンスを生成可能
- サービス・リポジトリは `app.service` 属性に注入される

#### エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | `index.html` を返す |
| POST | `/api/sessions` | セッション完了を記録 |
| GET | `/api/sessions/today` | 今日の進捗を返す |

#### コード例

````python
def create_app(config: object | None = None) -> Flask:
    app = Flask(__name__)
    
    if config:
        app.config.from_object(config)
    else:
        app.config.from_object(Config)
    
    # サービス・リポジトリの初期化
    repository = SessionRepository()
    service = PomodoroService(repository)
    app.service = service
    
    @app.route("/")
    def index() -> str:
        return render_template("index.html")
    
    @app.route("/api/sessions", methods=["POST"])
    def create_session() -> tuple:
        data = request.get_json()
        duration_minutes = data.get("duration_minutes", 25)
        result = service.complete_session(duration_minutes)
        return jsonify(result), 201
    
    @app.route("/api/sessions/today", methods=["GET"])
    def get_today_sessions() -> tuple:
        stats = service.get_today_stats()
        return jsonify(stats), 200
    
    return app
````

### 2. Service（services/pomodoro_service.py）

Flask に依存しない純粋なビジネスロジック。依存性注入（DI）でリポジトリを受け取り、テスト時にモック差し替えが可能。

#### 責務

- セッション完了の記録ロジック
- 統計情報の集計ロジック
- バリデーション（例: `duration_minutes` の正数チェック）

#### 実装

````python
class PomodoroService:
    def __init__(self, repository: SessionRepository) -> None:
        self.repository = repository
    
    def complete_session(self, duration_minutes: int) -> dict:
        """セッション完了を記録する。"""
        if duration_minutes <= 0:
            raise ValueError("duration_minutes は正の整数である必要があります")
        
        now = datetime.now()
        session = Session(id=0, duration_minutes=duration_minutes, completed_at=now)
        saved = self.repository.save(session)
        
        return {
            "id": saved.id,
            "completed_at": saved.completed_at.isoformat(),
        }
    
    def get_today_stats(self) -> dict:
        """今日の進捗統計を取得する。"""
        today = datetime.now().strftime("%Y-%m-%d")
        sessions = self.repository.find_by_date(today)
        
        completed_count = len(sessions)
        total_focus_minutes = sum(s.duration_minutes for s in sessions)
        
        return {
            "completed_count": completed_count,
            "total_focus_minutes": total_focus_minutes,
        }
````

### 3. Repository（repositories/session_repository.py）

データ永続化を抽象化する。現在はインメモリ実装だが、将来的に SQLite や PostgreSQL に移行可能。

#### 責務

- セッションデータの保存
- 日付による検索
- テスト用データリセット

#### 実装

````python
class SessionRepository:
    def __init__(self) -> None:
        self._sessions: list[Session] = []
        self._next_id: int = 1
    
    def save(self, session: Session) -> Session:
        """セッションを保存する。"""
        session.id = self._next_id
        self._next_id += 1
        self._sessions.append(session)
        return session
    
    def find_by_date(self, date: str) -> list[Session]:
        """指定日付のセッションを検索する（YYYY-MM-DD 形式）。"""
        return [
            s for s in self._sessions
            if s.completed_at.strftime("%Y-%m-%d") == date
        ]
    
    def clear(self) -> None:
        """すべてのセッションデータを削除する（テスト用）。"""
        self._sessions.clear()
        self._next_id = 1
````

### 4. Model（models/session.py）

純粋なデータ構造。`@dataclass` で定義される。

````python
@dataclass
class Session:
    id: int
    duration_minutes: int
    completed_at: datetime
````

---

## フロントエンド設計

### ファイルの責務分離

| ファイル | 責務 | テスト |
|---------|------|--------|
| `index.html` | セマンティックな構造定義 | — |
| `style.css` | 紫グラデーション背景、カード型UI、SVG、ボタン | — |
| `timer.js` | 純粋関数（時間計算、状態遷移、フォーマット） | Jest でテスト可能 |
| `ui.js` | DOM 操作、イベントリスナー、API 通信 | ブラウザ / 手動テスト |

### タイマー状態遷移

````
IDLE → WORKING(25:00) → SHORT_BREAK(5:00) → WORKING(25:00) → ...
                                               (4回目) → LONG_BREAK(15:00) → IDLE
````

### コア関数（timer.js）

| 関数 | 入力 | 出力 | 説明 |
|------|------|------|------|
| `formatTime(totalSeconds)` | 秒数 | `"MM:SS"` | 時間フォーマット |
| `calculateProgress(elapsed, total)` | 秒, 秒 | `0.0〜1.0` | SVG プログレス計算 |
| `nextState(currentState, sessionCount)` | 文字列, 整数 | `{ state, duration }` | 次の状態遷移 |

### UI モジュール（ui.js）

- **DOM 操作**: タイマー表示、プログレスバー、状態ラベル更新
- **イベント**: 開始/一時停止/リセットボタン、キーボードショートカット（Space, R）
- **API 通信**: `fetch` による `/api/sessions` と `/api/sessions/today` の呼び出し
- **通知**: ブラウザ通知 API、AudioContext による通知音
- **追加機能**: ページ離脱警告、ドキュメントタイトル更新、ポモドーロインジケーター、セッション履歴表示

---

## 設定管理（config.py）

環境ごとに異なる設定を管理する。

````python
class Config:
    """本番用設定。"""
    DEBUG: bool = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
    WORK_DURATION: int = 25 * 60  # 秒
    SHORT_BREAK_DURATION: int = 5 * 60
    LONG_BREAK_DURATION: int = 15 * 60
    SESSIONS_BEFORE_LONG_BREAK: int = 4

class TestConfig(Config):
    """テスト用設定（短い時間でテスト可能）。"""
    WORK_DURATION: int = 3  # 秒
    SHORT_BREAK_DURATION: int = 1
    LONG_BREAK_DURATION: int = 2
    SESSIONS_BEFORE_LONG_BREAK: int = 4
````

---

## テスト戦略

### テスト種別

| 種別 | 対象 | ツール | 実行方法 |
|------|------|--------|---------|
| Python 単体テスト | Service, Repository | pytest | `python -m pytest tests/ -v` |
| Python API テスト | Flask Routes | pytest + test_client | `python -m pytest tests/test_app.py -v` |
| JS 単体テスト | timer.js | Jest | `npx jest static/js/tests/` |

### テスト統一実行（Makefile）

````makefile
test: test-python test-js

test-python:
	cd 1.pomodoro && python -m pytest tests/ -v

test-js:
	cd 1.pomodoro && npx jest static/js/tests/
````

### テストパターン

- **Python サービス層**: モックリポジトリ注入で Flask 不要の単体テスト
- **Python API 層**: `create_app(TestConfig)` + `app.test_client()` で統合テスト
- **JavaScript**: timer.js の純粋関数を Node.js 上でテスト
- **API 契約検証**: Python と JS のテストで同じレスポンスキー名をアサート

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| バックエンド | Python 3.11+ / Flask |
| フロントエンド | HTML5 / CSS3 / JavaScript (ES Modules) |
| テンプレート | Jinja2 |
| Python テスト | pytest |
| JS テスト | Jest |
| CSS 手法 | SVG (circle), CSS グラデーション |
| データ永続化 | インメモリ（将来 SQLite 移行可能） |

---

## 依存性注入（DI）パターン

サービス層がリポジトリをコンストラクタで受け取る DI パターンを採用している。これにより以下のメリットがある：

- Flask に依存しないテストが可能
- モックリポジトリを注入して純粋な単体テストが書ける
- 将来の永続化方式変更（インメモリ → SQLite）に対応しやすい

---

## 今後の拡張方向

### 永続化

- インメモリ → SQLite / PostgreSQL への移行
- リポジトリインターフェースはそのまま、実装クラスのみ差し替え

### 認証・認可

- 複数ユーザー対応
- セッションごとにユーザー ID を記録

### 統計機能

- 日別・週別・月別の集中時間グラフ
- 目標設定とトラッキング

### UI/UX

- ダークモード対応
- 作業・休憩時間のカスタマイズ
- LocalStorage によるタイマー状態保存

---

## 参考資料

- [Flask 公式ドキュメント](https://flask.palletsprojects.com/)
- [pytest 公式ドキュメント](https://docs.pytest.org/)
- [Jest 公式ドキュメント](https://jestjs.io/)
- [レイヤードアーキテクチャ](https://en.wikipedia.org/wiki/Multitier_architecture)
