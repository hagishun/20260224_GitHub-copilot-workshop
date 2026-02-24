"""Flask API 統合テスト。"""

import json


class TestGetIndex:
    """GET / のテスト。"""

    def test_index_returns_200(self, client):
        """GET / が 200 を返す。"""
        response = client.get("/")
        assert response.status_code == 200

    def test_index_returns_html(self, client):
        """GET / が HTML を返す。"""
        response = client.get("/")
        assert b"<!DOCTYPE html>" in response.data or b"<html" in response.data

    def test_index_contains_timer_elements(self, client):
        """GET / にタイマー関連要素が含まれる。"""
        response = client.get("/")
        assert b"timer-display" in response.data
        assert b"start-btn" in response.data
        assert b"reset-btn" in response.data


class TestPostSessions:
    """POST /api/sessions のテスト。"""

    def test_post_sessions_returns_201(self, client):
        """POST /api/sessions が 201 を返す。"""
        response = client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_post_sessions_returns_id_and_completed_at(self, client):
        """POST /api/sessions が id と completed_at を返す。"""
        response = client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        data = response.get_json()
        assert "id" in data
        assert "completed_at" in data

    def test_post_sessions_default_duration(self, client):
        """duration_minutes 未指定時にデフォルト値（25）が使われる。"""
        response = client.post(
            "/api/sessions",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_post_sessions_increments_count(self, client):
        """複数 POST で進捗カウントが増える。"""
        client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )

        response = client.get("/api/sessions/today")
        data = response.get_json()
        assert data["completed_count"] == 2


class TestGetSessionsToday:
    """GET /api/sessions/today のテスト。"""

    def test_get_sessions_today_returns_200(self, client):
        """GET /api/sessions/today が 200 を返す。"""
        response = client.get("/api/sessions/today")
        assert response.status_code == 200

    def test_get_sessions_today_returns_stats(self, client):
        """GET /api/sessions/today が統計情報を返す。"""
        response = client.get("/api/sessions/today")
        data = response.get_json()
        assert "completed_count" in data
        assert "total_focus_minutes" in data

    def test_get_sessions_today_initial_state(self, client):
        """初期状態で completed_count と total_focus_minutes が 0。"""
        response = client.get("/api/sessions/today")
        data = response.get_json()
        assert data["completed_count"] == 0
        assert data["total_focus_minutes"] == 0

    def test_get_sessions_today_after_session(self, client):
        """セッション記録後に正しい統計を返す。"""
        client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )

        response = client.get("/api/sessions/today")
        data = response.get_json()
        assert data["completed_count"] == 1
        assert data["total_focus_minutes"] == 25


class TestGamificationStats:
    """GET /api/gamification/stats のテスト。"""

    def test_get_gamification_stats_returns_200(self, client):
        """GET /api/gamification/stats が 200 を返す。"""
        response = client.get("/api/gamification/stats")
        assert response.status_code == 200

    def test_get_gamification_stats_returns_correct_keys(self, client):
        """GET /api/gamification/stats が必要なキーを返す。"""
        response = client.get("/api/gamification/stats")
        data = response.get_json()
        assert "xp" in data
        assert "level" in data
        assert "current_streak" in data
        assert "longest_streak" in data
        assert "badges" in data

    def test_get_gamification_stats_initial_state(self, client):
        """初期状態で XP が 0、レベルが 1。"""
        response = client.get("/api/gamification/stats")
        data = response.get_json()
        assert data["xp"] == 0
        assert data["level"] == 1
        assert data["current_streak"] == 0
        assert data["longest_streak"] == 0
        assert len(data["badges"]) == 0

    def test_get_gamification_stats_after_session(self, client):
        """セッション完了後に XP が増加する。"""
        client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )

        response = client.get("/api/gamification/stats")
        data = response.get_json()
        assert data["xp"] == 50
        assert data["level"] == 1
        assert len(data["badges"]) >= 1  # 初回セッションバッジ


class TestGamificationBadges:
    """GET /api/gamification/badges のテスト。"""

    def test_get_badges_returns_200(self, client):
        """GET /api/gamification/badges が 200 を返す。"""
        response = client.get("/api/gamification/badges")
        assert response.status_code == 200

    def test_get_badges_returns_badges_key(self, client):
        """GET /api/gamification/badges が badges キーを返す。"""
        response = client.get("/api/gamification/badges")
        data = response.get_json()
        assert "badges" in data

    def test_get_badges_initial_state(self, client):
        """初期状態でバッジが空。"""
        response = client.get("/api/gamification/badges")
        data = response.get_json()
        assert len(data["badges"]) == 0


class TestWeeklyHistory:
    """GET /api/gamification/history/weekly のテスト。"""

    def test_get_weekly_history_returns_200(self, client):
        """GET /api/gamification/history/weekly が 200 を返す。"""
        response = client.get("/api/gamification/history/weekly")
        assert response.status_code == 200

    def test_get_weekly_history_returns_correct_keys(self, client):
        """GET /api/gamification/history/weekly が必要なキーを返す。"""
        response = client.get("/api/gamification/history/weekly")
        data = response.get_json()
        assert "total_sessions" in data
        assert "total_minutes" in data
        assert "avg_minutes_per_day" in data
        assert "completion_rate" in data
        assert "daily_data" in data

    def test_get_weekly_history_initial_state(self, client):
        """初期状態で総セッション数が 0。"""
        response = client.get("/api/gamification/history/weekly")
        data = response.get_json()
        assert data["total_sessions"] == 0
        assert data["total_minutes"] == 0
        assert len(data["daily_data"]) == 7

    def test_get_weekly_history_after_session(self, client):
        """セッション完了後に週間統計が更新される。"""
        client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )

        response = client.get("/api/gamification/history/weekly")
        data = response.get_json()
        assert data["total_sessions"] == 1
        assert data["total_minutes"] == 25


class TestMonthlyHistory:
    """GET /api/gamification/history/monthly のテスト。"""

    def test_get_monthly_history_returns_200(self, client):
        """GET /api/gamification/history/monthly が 200 を返す。"""
        response = client.get("/api/gamification/history/monthly")
        assert response.status_code == 200

    def test_get_monthly_history_returns_correct_keys(self, client):
        """GET /api/gamification/history/monthly が必要なキーを返す。"""
        response = client.get("/api/gamification/history/monthly")
        data = response.get_json()
        assert "total_sessions" in data
        assert "total_minutes" in data
        assert "avg_minutes_per_day" in data
        assert "completion_rate" in data
        assert "weekly_data" in data

    def test_get_monthly_history_initial_state(self, client):
        """初期状態で総セッション数が 0。"""
        response = client.get("/api/gamification/history/monthly")
        data = response.get_json()
        assert data["total_sessions"] == 0
        assert data["total_minutes"] == 0

    def test_get_monthly_history_after_session(self, client):
        """セッション完了後に月間統計が更新される。"""
        client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )

        response = client.get("/api/gamification/history/monthly")
        data = response.get_json()
        assert data["total_sessions"] == 1
        assert data["total_minutes"] == 25


class TestSessionCompletionWithGamification:
    """POST /api/sessions のゲーミフィケーション統合テスト。"""

    def test_post_sessions_returns_gamification_data(self, client):
        """POST /api/sessions がゲーミフィケーションデータを返す。"""
        response = client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        data = response.get_json()
        assert "xp" in data
        assert "level" in data
        assert "level_up" in data
        assert "new_badges" in data

    def test_first_session_grants_badge(self, client):
        """初回セッションでバッジが付与される。"""
        response = client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        data = response.get_json()
        assert len(data["new_badges"]) >= 1
        assert any(b["id"] == "first_session" for b in data["new_badges"])

    def test_level_up_detection(self, client):
        """レベルアップが検出される。"""
        # 1回目のセッション（50 XP）
        response1 = client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        data1 = response1.get_json()
        assert data1["level_up"] is False

        # 2回目のセッション（100 XP でレベルアップ）
        response2 = client.post(
            "/api/sessions",
            data=json.dumps({"duration_minutes": 25}),
            content_type="application/json",
        )
        data2 = response2.get_json()
        assert data2["level_up"] is True
        assert data2["level"] == 2
