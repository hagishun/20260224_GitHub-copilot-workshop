"""UserStatsRepository のユニットテスト。"""

from datetime import datetime

import pytest

from models.user_stats import Badge, UserStats
from repositories.user_stats_repository import UserStatsRepository


@pytest.fixture
def repository():
    """テスト用のリポジトリを作成する。"""
    return UserStatsRepository()


class TestGet:
    """get メソッドのテスト。"""

    def test_get_returns_initial_stats(self, repository):
        """初期統計を取得できることを確認する。"""
        stats = repository.get()

        assert isinstance(stats, UserStats)
        assert stats.xp == 0
        assert stats.level == 1
        assert stats.current_streak == 0
        assert stats.longest_streak == 0
        assert stats.last_session_date is None
        assert stats.badges == []


class TestUpdate:
    """update メソッドのテスト。"""

    def test_update_stats(self, repository):
        """統計を更新できることを確認する。"""
        stats = UserStats(
            xp=100,
            level=2,
            current_streak=3,
            longest_streak=5,
            last_session_date="2026-02-24",
        )

        updated = repository.update(stats)

        assert updated.xp == 100
        assert updated.level == 2
        assert updated.current_streak == 3
        assert updated.longest_streak == 5
        assert updated.last_session_date == "2026-02-24"

    def test_update_persists(self, repository):
        """更新が永続化されることを確認する。"""
        stats = UserStats(xp=150, level=2)
        repository.update(stats)

        retrieved = repository.get()
        assert retrieved.xp == 150
        assert retrieved.level == 2

    def test_update_with_badges(self, repository):
        """バッジ付きの統計を更新できることを確認する。"""
        badge = Badge(
            id="test_badge",
            name="テストバッジ",
            description="テスト用",
            earned_at=datetime.now(),
        )
        stats = UserStats(xp=50, level=1, badges=[badge])

        repository.update(stats)
        retrieved = repository.get()

        assert len(retrieved.badges) == 1
        assert retrieved.badges[0].id == "test_badge"


class TestClear:
    """clear メソッドのテスト。"""

    def test_clear_resets_stats(self, repository):
        """統計がリセットされることを確認する。"""
        stats = UserStats(xp=200, level=3, current_streak=5)
        repository.update(stats)

        repository.clear()

        retrieved = repository.get()
        assert retrieved.xp == 0
        assert retrieved.level == 1
        assert retrieved.current_streak == 0
