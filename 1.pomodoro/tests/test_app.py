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
