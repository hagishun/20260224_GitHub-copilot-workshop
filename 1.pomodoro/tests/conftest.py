"""pytest フィクスチャ定義。"""

import sys
from pathlib import Path

import pytest

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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
