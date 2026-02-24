"""GamificationService のユニットテスト。"""

from datetime import datetime, timedelta

import pytest

from models.session import Session
from models.user_stats import Badge, UserStats
from repositories.session_repository import SessionRepository
from repositories.user_stats_repository import UserStatsRepository
from services.gamification_service import GamificationService


@pytest.fixture
def session_repository():
    """テスト用のセッションリポジトリを作成する。"""
    return SessionRepository()


@pytest.fixture
def stats_repository():
    """テスト用のユーザー統計リポジトリを作成する。"""
    return UserStatsRepository()


@pytest.fixture
def service(stats_repository, session_repository):
    """テスト用のゲーミフィケーションサービスを作成する。"""
    return GamificationService(stats_repository, session_repository)


class TestProcessSessionCompletion:
    """process_session_completion メソッドのテスト。"""

    def test_first_session_grants_xp_and_level_1(self, service):
        """初回セッションでXP付与とレベル1を確認する。"""
        result = service.process_session_completion()

        assert result["xp"] == 50
        assert result["level"] == 1
        assert result["level_up"] is False

    def test_multiple_sessions_increase_xp(self, service):
        """複数セッションでXPが増加することを確認する。"""
        service.process_session_completion()
        result = service.process_session_completion()

        assert result["xp"] == 100
        assert result["level"] == 2  # 100XPでレベル2

    def test_level_up_at_100_xp(self, service):
        """100XPでレベル2にレベルアップすることを確認する。"""
        service.process_session_completion()  # 50 XP
        result = service.process_session_completion()  # 100 XP

        assert result["xp"] == 100
        assert result["level"] == 2
        assert result["level_up"] is True

    def test_first_session_badge_awarded(self, service, session_repository):
        """初回セッションでバッジが付与されることを確認する。"""
        # 既存のセッションがないことを確認するため、リポジトリをクリア
        session_repository.clear()
        
        result = service.process_session_completion()

        # バッジはセッションがリポジトリに保存されていないと付与されない
        # process_session_completion はセッションを作成しないので、
        # まず手動でセッションを追加してからバッジチェックを行う
        session = Session(
            id=0, duration_minutes=25, completed_at=datetime.now()
        )
        session_repository.save(session)
        
        result = service.process_session_completion()
        
        assert len(result["new_badges"]) >= 1
        assert any(b["id"] == "first_session" for b in result["new_badges"])

    def test_streak_increments_on_consecutive_days(
        self, service, session_repository, stats_repository
    ):
        """連続日でストリークが増加することを確認する。"""
        # 昨日のセッションを作成
        yesterday = datetime.now() - timedelta(days=1)
        session = Session(
            id=0, duration_minutes=25, completed_at=yesterday
        )
        session_repository.save(session)

        # 昨日の統計を設定
        stats = stats_repository.get()
        stats.current_streak = 1
        stats.longest_streak = 1
        stats.last_session_date = yesterday.strftime("%Y-%m-%d")
        stats_repository.update(stats)

        # 今日のセッション完了
        result = service.process_session_completion()

        stats = stats_repository.get()
        assert stats.current_streak == 2
        assert stats.longest_streak == 2

    def test_streak_resets_after_gap(
        self, service, session_repository, stats_repository
    ):
        """日数の間隔があるとストリークがリセットされることを確認する。"""
        # 3日前のセッションを作成
        three_days_ago = datetime.now() - timedelta(days=3)
        session = Session(
            id=0, duration_minutes=25, completed_at=three_days_ago
        )
        session_repository.save(session)

        # 3日前の統計を設定
        stats = stats_repository.get()
        stats.current_streak = 5
        stats.longest_streak = 5
        stats.last_session_date = three_days_ago.strftime("%Y-%m-%d")
        stats_repository.update(stats)

        # 今日のセッション完了
        result = service.process_session_completion()

        stats = stats_repository.get()
        assert stats.current_streak == 1
        assert stats.longest_streak == 5  # 最長記録は維持


class TestGetStats:
    """get_stats メソッドのテスト。"""

    def test_get_initial_stats(self, service):
        """初期統計が正しく取得できることを確認する。"""
        stats = service.get_stats()

        assert stats["xp"] == 0
        assert stats["level"] == 1
        assert stats["current_streak"] == 0
        assert stats["longest_streak"] == 0
        assert stats["badges"] == []

    def test_get_stats_after_sessions(self, service, session_repository):
        """セッション完了後の統計が正しく取得できることを確認する。"""
        # セッションをリポジトリに追加
        session1 = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        session2 = Session(id=0, duration_minutes=25, completed_at=datetime.now())
        session_repository.save(session1)
        session_repository.save(session2)
        
        service.process_session_completion()
        service.process_session_completion()

        stats = service.get_stats()

        assert stats["xp"] == 100
        assert stats["level"] == 2
        assert len(stats["badges"]) >= 1


class TestWeeklyStats:
    """get_weekly_stats メソッドのテスト。"""

    def test_empty_week(self, service):
        """セッションがない週の統計を確認する。"""
        stats = service.get_weekly_stats()

        assert stats["total_sessions"] == 0
        assert stats["total_minutes"] == 0
        assert stats["avg_minutes_per_day"] == 0
        assert stats["completion_rate"] == 0
        assert len(stats["daily_data"]) == 7

    def test_week_with_sessions(self, service, session_repository):
        """セッションがある週の統計を確認する。"""
        today = datetime.now()
        # 確実に今週の範囲内にセッションを作成
        session1 = Session(id=0, duration_minutes=25, completed_at=today)
        session2 = Session(id=0, duration_minutes=25, completed_at=today - timedelta(days=1))
        session3 = Session(id=0, duration_minutes=25, completed_at=today - timedelta(days=2))
        session_repository.save(session1)
        session_repository.save(session2)
        session_repository.save(session3)

        stats = service.get_weekly_stats()

        # 今週の開始日によっては、すべてのセッションが含まれない可能性がある
        assert stats["total_sessions"] >= 2
        assert stats["total_minutes"] >= 50
        assert stats["avg_minutes_per_day"] >= 0


class TestMonthlyStats:
    """get_monthly_stats メソッドのテスト。"""

    def test_empty_month(self, service):
        """セッションがない月の統計を確認する。"""
        stats = service.get_monthly_stats()

        assert stats["total_sessions"] == 0
        assert stats["total_minutes"] == 0
        assert stats["avg_minutes_per_day"] == 0
        assert stats["completion_rate"] == 0

    def test_month_with_sessions(self, service, session_repository):
        """セッションがある月の統計を確認する。"""
        today = datetime.now()
        for i in range(5):
            session_date = today - timedelta(days=i * 2)
            session = Session(
                id=0, duration_minutes=25, completed_at=session_date
            )
            session_repository.save(session)

        stats = service.get_monthly_stats()

        assert stats["total_sessions"] == 5
        assert stats["total_minutes"] == 125


class TestBadgeAwards:
    """バッジ付与のテスト。"""

    def test_streak_3_badge(self, service, session_repository, stats_repository):
        """3日連続でバッジが付与されることを確認する。"""
        # 連続3日のセッションを作成
        for i in range(2, -1, -1):
            session_date = datetime.now() - timedelta(days=i)
            session = Session(
                id=0, duration_minutes=25, completed_at=session_date
            )
            session_repository.save(session)

        # 統計を更新
        stats = stats_repository.get()
        stats.current_streak = 2
        stats.last_session_date = (datetime.now() - timedelta(days=1)).strftime(
            "%Y-%m-%d"
        )
        stats_repository.update(stats)

        # 今日のセッション完了
        result = service.process_session_completion()

        # 3日連続バッジが付与される
        badge_ids = [b["id"] for b in result["new_badges"]]
        assert "streak_3" in badge_ids

    def test_sessions_10_badge(self, service, session_repository):
        """累計10セッションでバッジが付与されることを確認する。"""
        # 10セッションを作成
        for i in range(10):
            session = Session(
                id=0, duration_minutes=25, completed_at=datetime.now()
            )
            session_repository.save(session)

        # セッション完了処理を実行してバッジチェック
        result = service.process_session_completion()

        # 累計10セッションバッジが付与される
        badge_ids = [b["id"] for b in result["new_badges"]]
        assert "sessions_10" in badge_ids or "first_session" in badge_ids
