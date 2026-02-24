# ポモドーロタイマー アーキテクチャ設計書

## 概要

Flask + HTML/CSS/JavaScript で構築するポモドーロタイマー Web アプリケーション。
テスタビリティと保守性を重視したレイヤードアーキテクチャを採用する。

---

## UIモック要素

| 要素 | 内容 |
|------|------|
| ヘッダー | 「ポモドーロタイマー」タイトル + ウィンドウ風装飾 |
| 状態表示 | 「作業中」/ 休憩中 の切り替え |
| 円形タイマー | 25:00 カウントダウン + SVG サークル型プログレスバー |
| 操作ボタン | 「開始」（塗りつぶし）/「リセット」（アウトライン） |
| 今日の進捗 | 完了セッション数 / 累計集中時間 |

---

## ディレクトリ構成

```
1.pomodoro/
├── app.py                          # Flask アプリファクトリ + ルーティング
├── config.py                       # 設定（本番用 / テスト用）
├── models/
│   └── session.py                  # Session データクラス
├── services/
│   └── pomodoro_service.py         # ビジネスロジック（Flask 非依存）
├── repositories/
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
│   ├── conftest.py                 # pytest fixtures
│   ├── test_pomodoro_service.py    # サービス層テスト
│   ├── test_session_repository.py  # リポジトリ層テスト
│   └── test_app.py                 # API 統合テスト（Flask test_client）
├── requirements.txt                # Python 依存パッケージ
├── package.json                    # Node.js 依存（Jest テスト用）
├── Makefile                        # 統一テスト実行コマンド
├── architecture.md                 # 本ドキュメント
├── API.md                          # API 仕様書
└── README.md                       # プロジェクト説明・セットアップ手順
```

---

## アーキテクチャ全体像

```
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
```

---

## レイヤー設計

### 1. Routes（app.py）

Flask のルーティングのみを担当する。ビジネスロジックは書かない。

- `GET /` — `index.html` を返す
- `POST /api/sessions` — セッション完了を記録
- `GET /api/sessions/today` — 今日の進捗を返す

**アプリファクトリパターン**を採用し、テストごとに独立したアプリインスタンスを生成可能にする。

```python
def create_app(config=None):
    app = Flask(__name__)
    if config:
        app.config.from_object(config)
    # サービス・リポジトリの初期化
    return app
```

### 2. Service（pomodoro_service.py）

Flask に依存しない純粋なビジネスロジック。依存性注入（DI）でリポジトリを受け取り、テスト時にモック差し替えが可能。

```python
class PomodoroService:
    def __init__(self, repository):
        self.repository = repository

    def complete_session(self, duration_minutes: int) -> dict: ...
    def get_today_stats(self) -> dict: ...
```

### 3. Repository（session_repository.py）

データ永続化を抽象化する。テスト間のデータ干渉を防ぎ、将来の永続化方式変更（インメモリ → SQLite）に対応。

```python
class SessionRepository:
    def save(self, session: Session) -> None: ...
    def find_by_date(self, date: str) -> list[Session]: ...
    def clear(self) -> None: ...  # テスト用リセット
```

### 4. Model（session.py）

純粋なデータ構造。

```python
@dataclass
class Session:
    id: int
    duration_minutes: int
    completed_at: datetime
```

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

```
IDLE → WORKING(25:00) → SHORT_BREAK(5:00) → WORKING(25:00) → ...
                                              (4回目) → LONG_BREAK(15:00) → IDLE
```

### コア関数（timer.js）

| 関数 | 入力 | 出力 | 説明 |
|------|------|------|------|
| `formatTime(totalSeconds)` | 秒数 | `"MM:SS"` | 時間フォーマット |
| `calculateProgress(elapsed, total)` | 秒, 秒 | `0.0〜1.0` | SVG プログレス計算 |
| `nextState(currentState, sessionCount)` | 文字列, 整数 | `{ state, duration }` | 次の状態遷移 |

### SVG 円形プログレスバー

```
circumference = 2 * π * radius
offset = circumference * (1 - progress)
```

- `stroke-dasharray`: 円周長
- `stroke-dashoffset`: 残り時間に応じた値
- `transform="rotate(-90)"`: 12時方向から開始

---

## API 仕様

### POST /api/sessions

セッション完了を記録する。

**Request:**
```json
{ "duration_minutes": 25 }
```

**Response (201):**
```json
{ "id": 1, "completed_at": "2026-02-24T10:30:00" }
```

### GET /api/sessions/today

今日の進捗を返す。

**Response (200):**
```json
{ "completed_count": 4, "total_focus_minutes": 100 }
```

---

## 設定管理（config.py）

```python
class Config:
    WORK_DURATION = 25 * 60       # 秒
    BREAK_DURATION = 5 * 60
    LONG_BREAK_DURATION = 15 * 60

class TestConfig(Config):
    WORK_DURATION = 3              # テスト用: 3秒
    BREAK_DURATION = 1
```

---

## テスト戦略

### テスト種別

| 種別 | 対象 | ツール | 実行方法 |
|------|------|--------|---------|
| Python 単体テスト | Service, Repository | pytest | `python -m pytest tests/ -v` |
| Python API テスト | Flask Routes | pytest + test_client | `python -m pytest tests/test_app.py -v` |
| JS 単体テスト | timer.js | Jest | `npx jest static/js/tests/` |

### テスト統一実行（Makefile）

```makefile
test: test-python test-js

test-python:
	cd 1.pomodoro && python -m pytest tests/ -v

test-js:
	cd 1.pomodoro && npx jest static/js/tests/
```

### テストパターン

- **Python サービス層**: モックリポジトリ注入で Flask 不要の単体テスト
- **Python API 層**: `create_app(TestConfig)` + `app.test_client()` で統合テスト
- **JavaScript**: timer.js の純粋関数を Node.js 上でテスト
- **API 契約検証**: Python と JS のテストで同じレスポンスキー名をアサート

---

## パッケージ管理

### Python（requirements.txt）

```
Flask
pytest
```

### Node.js（package.json）

```json
{
  "type": "module",
  "scripts": {
    "test": "jest",
    "test:all": "npm run test && python -m pytest tests/ -v"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

**注意**: `"type": "module"` により ES Modules をブラウザと Node.js 双方で利用可能にする。

---

## .gitignore

```gitignore
# Python
__pycache__/
*.pyc
.pytest_cache/
venv/

# Node.js
node_modules/
coverage/
```

---

## Copilot 連携設計

### Copilot Instructions（.github/copilot-instructions.md）

プロジェクト全体のコーディング規約を記述し、Copilot の提案精度を向上させる。

### ファイルパターン別 Instructions（.github/instructions/）

| ファイル | 対象 | 内容 |
|---------|------|------|
| `python.instructions.md` | `**/*.py` | 型ヒント、docstring、DI パターン |
| `javascript.instructions.md` | `**/*.js` | ES Modules、純粋関数分離 |

### Prompt テンプレート（.github/prompts/）

| ファイル | 用途 |
|---------|------|
| `create-unit-test.prompt.md` | ユニットテスト生成用 |
| `create-flask-endpoint.prompt.md` | 新規 API エンドポイント作成用 |

### Custom Agents（.github/agents/）

| エージェント | 用途 |
|-------------|------|
| `pomodoro-developer.agent.md` | Flask + JS 開発支援モード |
| `pomodoro-reviewer.agent.md` | コードレビュー品質ゲート |
| `pomodoro-debugger.agent.md` | 体系的デバッグモード |

### Skills（.github/skills/）

| スキル | 用途 |
|--------|------|
| `pomodoro-timer-logic/SKILL.md` | タイマーロジック実装ガイド |
| `svg-circular-progress/SKILL.md` | SVG 円形プログレスバー実装ガイド |
| `flask-testing-patterns/SKILL.md` | Flask テストパターンリファレンス |

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| バックエンド | Python / Flask |
| フロントエンド | HTML5 / CSS3 / JavaScript (ES Modules) |
| テンプレート | Jinja2 |
| Python テスト | pytest |
| JS テスト | Jest |
| CSS 手法 | SVG (circle), CSS グラデーション |
| データ永続化 | インメモリ（将来 SQLite 移行可能） |

---

## 開発フロー（推奨順序）

1. **Flask の雛形** — `create_app()` + ルーティング + テンプレート返却
2. **HTML 構造** — タイマー、ボタン、進捗エリアのマークアップ
3. **CSS スタイリング** — 紫背景、カードUI、円形プログレス、ボタン
4. **JS タイマーロジック** — `timer.js` の純粋関数 + ユニットテスト
5. **JS UI 連携** — `ui.js` で DOM 操作 + イベントリスナー
6. **API 実装** — Service / Repository 層 + テスト
7. **API 連携** — フロントエンドから fetch で進捗データ取得・記録
