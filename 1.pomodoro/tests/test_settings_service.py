"""ポモドーロタイマー設定サービスのテスト。"""

import pytest

from models.settings import Settings
from repositories.settings_repository import SettingsRepository
from services.settings_service import SettingsService


@pytest.fixture
def repository():
    """テスト用のリポジトリを生成する。"""
    return SettingsRepository()


@pytest.fixture
def service(repository):
    """テスト用のサービスを生成する。"""
    return SettingsService(repository)


class TestGetSettings:
    """get_settings のテスト。"""

    def test_returns_default_settings(self, service):
        """デフォルト設定を返す。"""
        result = service.get_settings()
        assert result["work_duration"] == 25
        assert result["short_break_duration"] == 5
        assert result["long_break_duration"] == 15
        assert result["theme"] == "light"
        assert result["sound_enabled"] is True
        assert result["start_sound_enabled"] is True
        assert result["end_sound_enabled"] is True
        assert result["tick_sound_enabled"] is False


class TestUpdateSettings:
    """update_settings のテスト。"""

    def test_updates_work_duration(self, service):
        """作業時間を更新できる。"""
        result = service.update_settings({"work_duration": 45})
        assert result["work_duration"] == 45
        assert result["short_break_duration"] == 5  # 他は変更なし

    def test_updates_theme(self, service):
        """テーマを更新できる。"""
        result = service.update_settings({"theme": "dark"})
        assert result["theme"] == "dark"

    def test_updates_sound_settings(self, service):
        """サウンド設定を更新できる。"""
        result = service.update_settings(
            {
                "sound_enabled": False,
                "tick_sound_enabled": True,
            }
        )
        assert result["sound_enabled"] is False
        assert result["tick_sound_enabled"] is True

    def test_updates_multiple_fields(self, service):
        """複数のフィールドを同時に更新できる。"""
        result = service.update_settings(
            {
                "work_duration": 35,
                "short_break_duration": 10,
                "theme": "focus",
            }
        )
        assert result["work_duration"] == 35
        assert result["short_break_duration"] == 10
        assert result["theme"] == "focus"

    def test_rejects_invalid_work_duration(self, service):
        """不正な作業時間を拒否する。"""
        with pytest.raises(ValueError, match="work_duration must be one of"):
            service.update_settings({"work_duration": 30})

    def test_rejects_invalid_break_duration(self, service):
        """不正な休憩時間を拒否する。"""
        with pytest.raises(ValueError, match="short_break_duration must be one of"):
            service.update_settings({"short_break_duration": 7})

    def test_rejects_invalid_theme(self, service):
        """不正なテーマを拒否する。"""
        with pytest.raises(ValueError, match="theme must be one of"):
            service.update_settings({"theme": "invalid"})

    def test_rejects_non_boolean_sound_setting(self, service):
        """ブール値でないサウンド設定を拒否する。"""
        with pytest.raises(ValueError, match="sound_enabled must be a boolean"):
            service.update_settings({"sound_enabled": "yes"})

    def test_partial_update_preserves_other_settings(self, service):
        """一部の設定更新が他の設定を保持する。"""
        service.update_settings({"work_duration": 45, "theme": "dark"})
        result = service.update_settings({"short_break_duration": 10})
        assert result["work_duration"] == 45  # 保持される
        assert result["theme"] == "dark"  # 保持される
        assert result["short_break_duration"] == 10  # 更新される
