"""PomodoroService のユニットテスト。"""

from datetime import datetime


class TestCompleteSession:
    """complete_session メソッドのテスト。"""

    def test_complete_session_returns_id_and_completed_at(self, service):
        """セッション完了で id と completed_at を含む辞書を返す。"""
        result = service.complete_session(25)

        assert "id" in result
        assert "completed_at" in result
        assert result["id"] == 1

    def test_complete_session_saves_to_repository(self, service, repository):
        """セッション完了がリポジトリに保存される。"""
        service.complete_session(25)

        today = datetime.now().strftime("%Y-%m-%d")
        sessions = repository.find_by_date(today)
        assert len(sessions) == 1
        assert sessions[0].duration_minutes == 25

    def test_complete_session_increments_id(self, service):
        """複数セッションの ID がインクリメントされる。"""
        r1 = service.complete_session(25)
        r2 = service.complete_session(25)
        assert r1["id"] == 1
        assert r2["id"] == 2

    def test_complete_session_with_invalid_duration_raises_error(self, service):
        """duration_minutes が 0 以下の場合 ValueError を発生させる。"""
        import pytest

        with pytest.raises(ValueError):
            service.complete_session(0)

        with pytest.raises(ValueError):
            service.complete_session(-5)


class TestGetTodayStats:
    """get_today_stats メソッドのテスト。"""

    def test_get_today_stats_with_no_sessions(self, service):
        """セッションがない場合、0 を返す。"""
        stats = service.get_today_stats()
        assert stats["completed_count"] == 0
        assert stats["total_focus_minutes"] == 0

    def test_get_today_stats_with_one_session(self, service):
        """1セッション完了後に正しい統計を返す。"""
        service.complete_session(25)

        stats = service.get_today_stats()
        assert stats["completed_count"] == 1
        assert stats["total_focus_minutes"] == 25

    def test_get_today_stats_with_multiple_sessions(self, service):
        """複数セッション完了後に正しい統計を返す。"""
        service.complete_session(25)
        service.complete_session(25)
        service.complete_session(25)

        stats = service.get_today_stats()
        assert stats["completed_count"] == 3
        assert stats["total_focus_minutes"] == 75

    def test_get_today_stats_response_keys(self, service):
        """レスポンスに必要なキーが含まれている。"""
        stats = service.get_today_stats()
        assert "completed_count" in stats
        assert "total_focus_minutes" in stats
