# スキル: Flask テストパターン

## 概要

ポモドーロタイマーアプリケーションにおける Flask テストのパターンとベストプラクティス。

## テスト構成

```
tests/
├── conftest.py                 # 共通フィクスチャ
├── test_pomodoro_service.py    # サービス層テスト
├── test_session_repository.py  # リポジトリ層テスト
└── test_app.py                 # API 統合テスト
```

## 1. フィクスチャ（conftest.py）

```python
import pytest
from app import create_app
from config import TestConfig
from repositories.session_repository import SessionRepository
from services.pomodoro_service import PomodoroService


@pytest.fixture
def app():
    """テスト用 Flask アプリケーションを生成する。"""
    app = create_app(TestConfig)
    yield app


@pytest.fixture
def client(app):
    """テスト用 HTTP クライアントを生成する。"""
    return app.test_client()


@pytest.fixture
def repository():
    """テスト用リポジトリを生成する（各テストで初期化）。"""
    repo = SessionRepository()
    repo.clear()
    return repo


@pytest.fixture
def service(repository):
    """テスト用サービスを生成する。"""
    return PomodoroService(repository)
```

## 2. リポジトリ層テスト

Flask に依存しない純粋なデータアクセステスト。

```python
def test_save_and_find_by_date(repository):
    """保存したセッションを日付で検索できる。"""
    session = Session(id=1, duration_minutes=25, completed_at=datetime.now())
    repository.save(session)

    today = datetime.now().strftime('%Y-%m-%d')
    results = repository.find_by_date(today)
    assert len(results) == 1
    assert results[0].duration_minutes == 25


def test_find_by_date_returns_empty_for_no_data(repository):
    """データがない日付では空リストを返す。"""
    results = repository.find_by_date('2000-01-01')
    assert results == []


def test_clear_removes_all_data(repository):
    """clear() ですべてのデータが削除される。"""
    session = Session(id=1, duration_minutes=25, completed_at=datetime.now())
    repository.save(session)
    repository.clear()

    today = datetime.now().strftime('%Y-%m-%d')
    assert repository.find_by_date(today) == []
```

## 3. サービス層テスト

モックリポジトリを注入して Flask 不要でテスト。

```python
def test_complete_session_saves_to_repository(service, repository):
    """セッション完了がリポジトリに保存される。"""
    result = service.complete_session(duration_minutes=25)

    assert 'id' in result
    assert 'completed_at' in result

    today = datetime.now().strftime('%Y-%m-%d')
    sessions = repository.find_by_date(today)
    assert len(sessions) == 1


def test_get_today_stats_with_no_sessions(service):
    """セッションがない場合、0 を返す。"""
    stats = service.get_today_stats()
    assert stats['completed_count'] == 0
    assert stats['total_focus_minutes'] == 0


def test_get_today_stats_with_multiple_sessions(service):
    """複数セッション完了後に正しい統計を返す。"""
    service.complete_session(25)
    service.complete_session(25)

    stats = service.get_today_stats()
    assert stats['completed_count'] == 2
    assert stats['total_focus_minutes'] == 50
```

## 4. API 統合テスト

`test_client()` を使ったエンドポイントテスト。

```python
def test_post_sessions_returns_201(client):
    """POST /api/sessions が 201 を返す。"""
    response = client.post('/api/sessions',
                          json={'duration_minutes': 25})
    assert response.status_code == 201

    data = response.get_json()
    assert 'id' in data
    assert 'completed_at' in data


def test_get_sessions_today_returns_200(client):
    """GET /api/sessions/today が 200 を返す。"""
    response = client.get('/api/sessions/today')
    assert response.status_code == 200

    data = response.get_json()
    assert 'completed_count' in data
    assert 'total_focus_minutes' in data


def test_get_index_returns_html(client):
    """GET / が HTML を返す。"""
    response = client.get('/')
    assert response.status_code == 200
    assert b'<!DOCTYPE html>' in response.data or b'<html' in response.data
```

## テスト実行

```bash
# 全テスト
python -m pytest tests/ -v

# 特定のテストファイル
python -m pytest tests/test_app.py -v

# 特定のテスト関数
python -m pytest tests/test_pomodoro_service.py::test_complete_session_saves_to_repository -v

# カバレッジ
python -m pytest tests/ -v --cov=. --cov-report=html
```

## ベストプラクティス

- 各テストは独立して実行可能にする（`repository.clear()` で初期化）
- テスト名は `test_<対象>_<条件>_<期待結果>` の形式
- Arrange-Act-Assert パターンを使う
- API テストではレスポンスのステータスコードとJSONキーの両方を検証する
