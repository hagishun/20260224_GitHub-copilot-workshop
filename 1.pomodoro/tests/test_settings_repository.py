"""ポモドーロタイマー設定リポジトリのテスト。"""

from models.settings import Settings
from repositories.settings_repository import SettingsRepository


class TestSettingsRepository:
    """SettingsRepository のテスト。"""

    def test_get_returns_default_settings(self):
        """初期状態でデフォルト設定を返す。"""
        repo = SettingsRepository()
        settings = repo.get()
        assert isinstance(settings, Settings)
        assert settings.work_duration == 25
        assert settings.theme == "light"

    def test_save_and_get(self):
        """設定を保存して取得できる。"""
        repo = SettingsRepository()
        new_settings = Settings(
            work_duration=45,
            short_break_duration=10,
            theme="dark",
        )
        repo.save(new_settings)
        retrieved = repo.get()
        assert retrieved.work_duration == 45
        assert retrieved.short_break_duration == 10
        assert retrieved.theme == "dark"

    def test_reset_restores_defaults(self):
        """reset でデフォルト設定に戻る。"""
        repo = SettingsRepository()
        # カスタム設定を保存
        custom_settings = Settings(work_duration=45, theme="dark")
        repo.save(custom_settings)
        # リセット
        repo.reset()
        # デフォルトに戻る
        settings = repo.get()
        assert settings.work_duration == 25
        assert settings.theme == "light"
